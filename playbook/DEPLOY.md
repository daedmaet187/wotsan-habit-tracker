# Deploy Runbooks: wotsan-habit-tracker

Each runbook is a numbered procedure. Commands are copy-pasteable. Success criteria are explicit.

---

## Runbook 1: Deploy Backend (Automated)

**Trigger:** Push to `main` with changes in `backend/` or `.github/workflows/backend.yml`

**Pipeline (`backend.yml`):**
1. Checkout code
2. Configure AWS credentials (from GitHub secrets)
3. Login to ECR: `aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY_URL`
4. Build Docker image: `docker build -t $ECR_REGISTRY_URL/wotsan-habit-tracker-api:$GITHUB_SHA backend/`
5. Push image to ECR
6. Register new ECS task definition with updated image tag
7. Update ECS service: `aws ecs update-service --cluster wotsan-habit-tracker-cluster --service wotsan-habit-tracker-api --task-definition wotsan-habit-tracker-api:<NEW_REVISION> --force-new-deployment`
8. ECS performs rolling replacement (old task stays until new task is healthy)

**Manual trigger:**
```bash
gh workflow run backend.yml
```

**Verify deployment success:**
```bash
curl https://habit-api.stuff187.com/health
# Expected: {"status":"ok"}
```

**Check ECS service status:**
```bash
aws ecs describe-services \
  --cluster wotsan-habit-tracker-cluster \
  --services wotsan-habit-tracker-api \
  --region eu-central-1 \
  --query 'services[0].deployments'
```
Success: `runningCount=1`, `desiredCount=1`, old deployment gone.

**Check logs:**
```bash
aws logs tail /ecs/wotsan-habit-tracker-api --follow --region eu-central-1
```

**Rollback:**
```bash
# Find previous revision number
aws ecs list-task-definitions \
  --family-prefix wotsan-habit-tracker-api \
  --sort DESC \
  --region eu-central-1

# Roll back to previous revision
aws ecs update-service \
  --cluster wotsan-habit-tracker-cluster \
  --service wotsan-habit-tracker-api \
  --task-definition wotsan-habit-tracker-api:<PREVIOUS_REVISION> \
  --force-new-deployment \
  --region eu-central-1
```

---

## Runbook 2: Deploy Admin SPA (Automated)

**Trigger:** Push to `main` with changes in `admin/`

**Pipeline (`admin.yml`):**
1. Checkout code
2. Configure AWS credentials
3. `cd admin && npm ci`
4. `npm run build` (Vite builds to `admin/dist/`) — env var `VITE_API_URL=https://habit-api.stuff187.com`
5. `aws s3 sync admin/dist/ s3://wotsan-habit-admin --delete`
6. `aws cloudfront create-invalidation --distribution-id E2ZTBWJSRJ2RVI --paths "/*"`

**Manual trigger:**
```bash
gh workflow run admin.yml
```

**Verify deployment success:**
```bash
curl -I https://habit-admin.stuff187.com
# Expected: HTTP/2 200 with Content-Type: text/html
```

**Rollback:**
Rollback requires keeping previous build artifact. If artifact was saved in GitHub Actions:
1. Download previous `dist/` artifact from GitHub Actions run
2. `aws s3 sync dist/ s3://wotsan-habit-admin --delete`
3. `aws cloudfront create-invalidation --distribution-id E2ZTBWJSRJ2RVI --paths "/*"`

---

## Runbook 3: Deploy Infrastructure (Automated)

**Trigger:** Push to `main` with changes in `infra/`

**Pipeline (`infra.yml`):**
1. Checkout code
2. Configure AWS credentials
3. Setup OpenTofu
4. `cd infra && tofu init`
5. `tofu plan -out=tfplan` (plan saved, output visible in Actions log)
6. `tofu apply tfplan`

**⚠️ WARNING:** `tofu apply` runs automatically on push. Review the plan output in GitHub Actions before merging any infra changes to `main`.

**Manual trigger:**
```bash
gh workflow run infra.yml
```

**Monitor plan output:**
```bash
gh run list --workflow=infra.yml --limit 5
gh run view <RUN_ID> --log
```

**Local apply (for testing/emergency):**
```bash
cd infra
tofu init
tofu plan -var-file=terraform.tfvars
# Review plan carefully
tofu apply -var-file=terraform.tfvars
```

**After first apply — get outputs:**
```bash
cd infra
tofu output ecr_repo_url
# Add this value as GitHub secret ECR_REGISTRY_URL
tofu output api_alb_dns
# Verify Cloudflare CNAME points here
```

**Verify infra health:**
```bash
# Check ECS cluster
aws ecs describe-clusters --clusters wotsan-habit-tracker-cluster --region eu-central-1

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <TG_ARN> \
  --region eu-central-1
# Expected: target health = healthy
```

---

## Runbook 4: Database Migrations

**Migrations are NOT automated. Run manually before first deploy and after any schema change.**

**Migration files** (run in order):
1. `backend/src/db/migrations/001_create_users.sql`
2. `backend/src/db/migrations/002_create_habits.sql`
3. `backend/src/db/migrations/003_create_habit_logs.sql`

**Run migrations** (requires `DATABASE_URL` pointing to live RDS):
```bash
cd backend
export DATABASE_URL="postgres://postgres:<password>@<rds-endpoint>:5432/habitdb"
node src/db/migrate.js
```

**Expected output:**
```
Running migration: 001_create_users.sql ... OK
Running migration: 002_create_habits.sql ... OK
Running migration: 003_create_habit_logs.sql ... OK
All migrations complete.
```

**Verify migration success:**
```bash
# Connect to RDS (via bastion or local tunnel) and run:
psql $DATABASE_URL -c "\dt"
# Expected: tables listed: users, habits, habit_logs
```

**⚠️ Order matters.** Habits FK → users. Habit_logs FK → habits and users. Always run in sequence 001 → 002 → 003.

---

## Runbook 5: Mobile Build + APK

**CI builds APK on every push to `main` affecting `mobile/` (mobile.yml).**

**Download APK artifact from CI:**
```bash
gh run list --workflow=mobile.yml --limit 5
gh run download <RUN_ID> --name release-apk --dir ./apk-output
```

**Build APK locally:**
```bash
cd mobile
flutter pub get
flutter build apk --release \
  --dart-define=API_URL=https://habit-api.stuff187.com
# Output: mobile/build/app/outputs/flutter-apk/app-release.apk
```

**Build iOS (local Mac only):**
```bash
cd mobile
flutter pub get
flutter build ios --release \
  --dart-define=API_URL=https://habit-api.stuff187.com
# Then open Xcode → Product → Archive → distribute
```

**Verify build:**
```bash
flutter analyze --no-fatal-infos
# Expected: zero issues
```

---

## Runbook 6: First-Time Setup (Zero to Running)

Complete setup from a fresh clone. Estimated time: 30-60 minutes.

**Prerequisites:** AWS account, Cloudflare account with stuff187.com zone, GitHub account

### Step 1: Clone and configure
```bash
git clone https://github.com/daedmaet187/wotsan-habit-tracker.git
cd wotsan-habit-tracker
```

### Step 2: Set GitHub secrets
Navigate to: `https://github.com/daedmaet187/wotsan-habit-tracker/settings/secrets/actions`

Set all secrets from `SECRETS.md` → GitHub Repository Secrets section.
Do NOT set `ECR_REGISTRY_URL` yet — you'll get it from Tofu output in Step 6.

### Step 3: Create OpenTofu state bucket
```bash
aws s3 mb s3://wotsan-opentofu-state --region eu-central-1
aws s3api put-bucket-versioning \
  --bucket wotsan-opentofu-state \
  --versioning-configuration Status=Enabled
```

### Step 4: Create Cloudflare API token
1. Cloudflare dashboard → My Profile → API Tokens → Create Token
2. Use template: "Edit zone DNS"
3. Zone: stuff187.com
4. Save token → set as `CF_DNS_TOKEN` GitHub secret
5. Copy Zone ID from Cloudflare zone overview → set as `CF_ZONE_ID` GitHub secret

### Step 5: Deploy infrastructure
```bash
# Trigger infra.yml by making a dummy commit to infra/
git commit --allow-empty -m "chore: trigger infra deployment"
git push origin main
```
Monitor: `gh run list --workflow=infra.yml`
Wait for: ✅ completed successfully

### Step 6: Get ECR URL and add to GitHub secrets
```bash
cd infra
tofu output ecr_repo_url
```
Copy the output → add as GitHub secret `ECR_REGISTRY_URL`

### Step 7: Run database migrations
```bash
# Get RDS endpoint from Tofu output or AWS console
cd backend
export DATABASE_URL="postgres://postgres:<DB_PASSWORD>@<rds-endpoint>:5432/habitdb"
node src/db/migrate.js
# Expected: "All migrations complete."
```

### Step 8: Deploy backend
```bash
gh workflow run backend.yml
# Monitor:
gh run list --workflow=backend.yml
```
Wait for: ✅ completed

**Verify:**
```bash
curl https://habit-api.stuff187.com/health
# Expected: {"status":"ok"}
```

### Step 9: Deploy admin SPA
```bash
gh workflow run admin.yml
# Monitor:
gh run list --workflow=admin.yml
```
Wait for: ✅ completed

**Verify:**
```bash
curl -I https://habit-admin.stuff187.com
# Expected: HTTP/2 200
```

### Step 10: Verify mobile build
```bash
gh workflow run mobile.yml
gh run list --workflow=mobile.yml
# Download APK artifact when complete
```

**Setup complete.** All layers running. ✅
