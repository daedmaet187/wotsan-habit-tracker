# Infrastructure Improvement Plan

**Date:** 2026-03-25  
**Status:** Draft — Awaiting approval before implementation  
**Author:** Watson (orchestrator)

---

## 1. AWS OIDC Federation (Replace IAM Access Keys)

### Current State
- Backend CI uses `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` stored as GitHub Secrets
- Long-lived credentials pose security risk if leaked
- Manual key rotation burden

### Proposed Changes

#### A. Terraform Changes (`infra/modules/oidc/main.tf` - new module)

```hcl
# Create OIDC provider for GitHub
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${var.project}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:daedmaet187/wotsan-habit-tracker:*"
        }
      }
    }]
  })
}

# Attach required policies
resource "aws_iam_role_policy_attachment" "ecr_push" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy" "ecs_deploy" {
  name = "${var.project}-ecs-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "arn:aws:iam::*:role/${var.project}-ecs-*"
      }
    ]
  })
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}
```

#### B. Workflow Changes (`.github/workflows/backend.yml`)

Replace the AWS credentials step:

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/wotsan-habit-tracker-github-actions
    aws-region: eu-central-1
```

Remove these secrets after migration:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

#### C. Migration Steps
1. Apply Terraform changes to create OIDC provider and role
2. Note the role ARN from Terraform output
3. Update workflow file with role ARN
4. Test deployment on a branch first
5. Once verified, delete old IAM access keys
6. Remove secrets from GitHub repo settings

---

## 2. Staging Environment

### Current State
- Single production environment
- No way to test infra changes safely

### Proposed Architecture

```
Production:
  API:    https://habit-api.stuff187.com
  Admin:  https://habit-admin.stuff187.com
  
Staging:
  API:    https://habit-api-staging.stuff187.com
  Admin:  https://habit-admin-staging.stuff187.com
```

### Implementation Approach

#### A. Workspace-based Terraform

Create `infra/environments/staging.tfvars`:

```hcl
project       = "wotsan-habit-tracker-staging"
aws_region    = "eu-central-1"
api_subdomain = "habit-api-staging"
admin_subdomain = "habit-admin-staging"
```

Modify `main.tf` to accept environment-specific values:

```hcl
variable "environment" {
  default = "production"
}

locals {
  project_name = var.environment == "production" 
    ? "wotsan-habit-tracker" 
    : "wotsan-habit-tracker-staging"
}
```

#### B. Separate State Files

```hcl
# For staging
terraform {
  backend "s3" {
    bucket = "wotsan-opentofu-state"
    key    = "habit-tracker/staging/opentofu.tfstate"  # Different key
    region = "eu-central-1"
  }
}
```

#### C. Resource Considerations

| Resource | Staging Spec | Production Spec | Notes |
|----------|-------------|-----------------|-------|
| ECS Tasks | 256 CPU / 512 MB | 256 CPU / 512 MB | Same for now |
| RDS | db.t4g.micro | db.t4g.micro | Smallest available |
| ALB | Shared? | Dedicated | Could share to save cost |

#### D. CI/CD Changes

Add staging deployment job to `backend.yml`:

```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    # ... same as deploy but with staging cluster/service names
    
  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: deploy-staging  # Optional: require staging success first
    # ... current production deployment
```

#### E. Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| ECS Fargate (256/512, 1 task) | ~$8 |
| RDS db.t4g.micro | ~$12 |
| ALB (shared listener rules) | ~$0 (already paid) |
| NAT Gateway (shared) | ~$0 |
| **Total Additional** | **~$20/month** |

---

## 3. CloudWatch Alarms

### Proposed Alerts

#### A. API 5xx Error Rate

```hcl
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.project}-api-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API returning too many 5xx errors"
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
```

#### B. ECS CPU/Memory Utilization

```hcl
resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "${var.project}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS task CPU > 80%"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api.name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  alarm_name          = "${var.project}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS task memory > 80%"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api.name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

#### C. RDS Storage Alert

```hcl
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120  # 5 GB in bytes
  alarm_description   = "RDS free storage < 5 GB"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

#### D. SNS Topic for Alerts

```hcl
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-alerts"
}

# Email subscription (manual confirmation required)
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

---

## Implementation Order

1. **Phase 3a: OIDC** (1-2 hours)
   - Low risk, immediate security improvement
   - Can be tested on branch before merge

2. **Phase 3c: CloudWatch Alarms** (1 hour)
   - No infrastructure changes, just monitoring
   - Immediate visibility benefits

3. **Phase 3b: Staging Environment** (2-4 hours)
   - Higher complexity
   - Requires careful state management
   - Do after OIDC is stable

---

## Files to Create/Modify

### New Files
- `infra/modules/oidc/main.tf`
- `infra/modules/monitoring/main.tf`
- `infra/environments/staging.tfvars`
- `infra/environments/production.tfvars`

### Modified Files
- `infra/main.tf` — add OIDC and monitoring modules
- `.github/workflows/backend.yml` — OIDC role assumption
- `.github/workflows/admin.yml` — staging deployment support

---

## Approval Required

This plan affects production infrastructure. Before implementation:

- [ ] Watson reviews and approves
- [ ] Verify AWS account has OIDC provider limit (default: 100)
- [ ] Confirm SNS email endpoint for alerts
- [ ] Decide on staging cost acceptance (~$20/month)

---

*End of plan.*
