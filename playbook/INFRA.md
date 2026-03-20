# Infrastructure: wotsan-habit-tracker

All infrastructure is defined in `infra/` using OpenTofu. State is in S3. GitHub Actions applies on push.

---

## State Backend

| Field | Value |
|---|---|
| S3 bucket | wotsan-opentofu-state |
| State key | habit-tracker/opentofu.tfstate |
| Region | eu-central-1 |
| Lock | DynamoDB (if configured) or S3 native locking |

Backend block in `infra/main.tf`:
```hcl
terraform {
  backend "s3" {
    bucket = "wotsan-opentofu-state"
    key    = "habit-tracker/opentofu.tfstate"
    region = "eu-central-1"
  }
}
```

---

## OpenTofu Modules

### `infra/modules/network/`
Creates the VPC foundation.

**Resources:**
- VPC (`10.0.0.0/16`)
- 2 public subnets (for ALB)
- 2 private subnets (for ECS + RDS)
- Internet Gateway (attached to public subnets)
- Route tables

**Outputs:** `vpc_id`, `public_subnet_ids`, `private_subnet_ids`

---

### `infra/modules/ecr/`
Creates the container registry.

**Resources:**
- ECR repository: `wotsan-habit-tracker-api`
- Image scan on push enabled
- Lifecycle policy: keep last 10 images

**Outputs:** `ecr_repo_url` (format: `123456789.dkr.ecr.eu-central-1.amazonaws.com/wotsan-habit-tracker-api`)

---

### `infra/modules/rds/`
Creates the PostgreSQL database.

**Resources:**
- RDS instance: PostgreSQL 15, `db.t3.micro`
- Placed in private subnets
- Security group: ingress port 5432 from ECS security group ONLY (no public access)
- Multi-AZ: false (MVP, cost control)
- Automated backups: 7-day retention

**Variables consumed:** `db_password` (sensitive)

**Outputs:** `db_endpoint`, `db_name` (used to build DATABASE_URL for ECS task)

---

### `infra/modules/alb/`
Creates the Application Load Balancer.

**Resources:**
- ALB in public subnets
- Security group: ingress 80 + 443 from `0.0.0.0/0`
- HTTPS listener (port 443) with ACM certificate for `habit-api.stuff187.com`
- HTTP listener (port 80) → redirect to HTTPS
- Target group: protocol HTTP, port 3000, health check `GET /health` → expects 200

**Outputs:** `alb_dns_name` (used by cloudflare module for CNAME)

---

### `infra/modules/ecs/`
Creates the ECS cluster and runs the API container.

**Resources:**
- ECS cluster: `wotsan-habit-tracker-cluster`
- Task definition:
  - Family: `wotsan-habit-tracker-api`
  - CPU: 256 / Memory: 512 MB
  - Network mode: `awsvpc`
  - Container: pulls from ECR (`ecr_repo_url:latest`)
  - Environment vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `PORT=3000`, `NODE_ENV=production`
  - Log driver: `awslogs` → group `/ecs/wotsan-habit-tracker-api`, region `eu-central-1`
- ECS service:
  - Name: `wotsan-habit-tracker-api`
  - Launch type: `FARGATE`
  - Desired count: `1`
  - Network: private subnets, security group below
  - Load balancer: attaches to ALB target group
- Security group (ECS tasks):
  - Ingress: port 3000 from ALB security group ONLY
  - Egress: all (needs outbound for ECR pull, RDS, CloudWatch)
- IAM execution role: allows ECS to pull from ECR and write CloudWatch logs
- CloudWatch log group: `/ecs/wotsan-habit-tracker-api`, retention 7 days

**Variables consumed:** `jwt_secret` (sensitive), `db_password` (to construct DATABASE_URL)

---

### `infra/modules/cloudflare/`
Creates DNS record for the API.

**Resources:**
- DNS record: `habit-api.stuff187.com` CNAME → ALB DNS name
- `proxied = false` (Cloudflare proxy disabled — ALB handles TLS via ACM)

**Variables consumed:** `cf_dns_token` (sensitive), `cloudflare_zone_id`

---

## Variables

All variables defined in `infra/variables.tf`. Set via GitHub secrets → passed as `-var` flags in infra.yml.

| Variable | Default | Sensitive | Description |
|---|---|---|---|
| `aws_region` | `eu-central-1` | No | AWS deployment region |
| `project` | `wotsan-habit-tracker` | No | Project name prefix for all resources |
| `db_password` | (required) | **Yes** | RDS PostgreSQL password |
| `cf_dns_token` | (required) | **Yes** | Cloudflare API token (Zone:Edit DNS) |
| `cloudflare_zone_id` | (required) | No | Cloudflare zone ID for stuff187.com |
| `jwt_secret` | (required) | **Yes** | JWT signing secret (minimum 32 chars) |

---

## Outputs

| Output | Value |
|---|---|
| `api_alb_dns` | ALB DNS name (e.g. `wotsan-habit-tracker-alb-123456.eu-central-1.elb.amazonaws.com`) |
| `ecr_repo_url` | ECR registry URL to add as GitHub secret `ECR_REGISTRY_URL` |

---

## Admin SPA Hosting

The admin SPA is **NOT** on Cloudflare Pages. It uses S3 + CloudFront. See ADR-006.

| Resource | Value |
|---|---|
| S3 bucket | `wotsan-habit-admin` |
| CloudFront distribution | `E2ZTBWJSRJ2RVI` |
| Domain | `habit-admin.stuff187.com` |
| Deployment | `admin.yml` → `aws s3 sync dist/ s3://wotsan-habit-admin` + invalidation |

---

## Apply Order

OpenTofu resolves the dependency graph automatically via `depends_on` and output references. Logical order:

```
network → ecr → rds → alb → ecs → cloudflare
```

- `ecs` depends on `network` (subnet IDs), `ecr` (repo URL), `rds` (endpoint), `alb` (target group ARN)
- `cloudflare` depends on `alb` (DNS name for CNAME target)

---

## Local Development with Infra

```bash
# Initialize (downloads providers)
cd infra
tofu init

# Preview changes (safe, no apply)
tofu plan -var="db_password=..." -var="jwt_secret=..." -var="cf_dns_token=..." -var="cloudflare_zone_id=..."

# Apply (destructive — check plan first)
tofu apply -var="db_password=..." -var="jwt_secret=..." ...

# Preferred: use tfvars file (not committed)
tofu plan -var-file=terraform.tfvars
tofu apply -var-file=terraform.tfvars
```

`terraform.tfvars` format (never commit this file):
```hcl
db_password       = "..."
jwt_secret        = "..."
cf_dns_token      = "..."
cloudflare_zone_id = "..."
```
