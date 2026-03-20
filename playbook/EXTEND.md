# Extension Guide: Clone This Pattern

How to use wotsan-habit-tracker as a template for a new full-stack project.

---

## What's Reusable

Everything in this list is project-agnostic and can be used as-is with only find-and-replace changes:

### Infrastructure (infra/)
- `infra/modules/network/` — VPC, subnets, internet gateway
- `infra/modules/ecr/` — Container registry
- `infra/modules/ecs/` — ECS Fargate cluster + service + task definition
- `infra/modules/rds/` — RDS PostgreSQL in private subnet
- `infra/modules/alb/` — Application Load Balancer + target group
- `infra/modules/cloudflare/` — Cloudflare DNS CNAME record
- `infra/main.tf` — Module composition pattern (just swap variable values)
- S3 state backend pattern

### CI/CD (.github/workflows/)
- `backend.yml` — Docker build → ECR push → ECS deploy
- `admin.yml` — npm build → S3 sync → CloudFront invalidation
- `infra.yml` — OpenTofu init → plan → apply
- `mobile.yml` — Flutter build → artifact upload

### Backend (backend/)
- Auth boilerplate: `src/controllers/authController.js`, `src/middleware/authMiddleware.js`, `src/utils/auth.js`
- Error handling: `src/middleware/errorHandler.js`
- Express app setup: `src/app.js` (rate limiting, compression, CORS, JSON parsing)
- Database pool: `src/db/pool.js`
- Migration runner: `src/db/migrate.js`
- Dockerfile (multi-stage, Alpine base)
- ESM + Express 5 + Zod pattern

### Admin Dashboard (admin/)
- Full React 19 + Vite 6 + TailwindCSS 4 shell
- Auth flow (login page, token storage, axios interceptor)
- @tanstack/react-query setup with queryClient
- shadcn/ui components in `admin/src/components/ui/`
- Layout shell with sidebar navigation
- User management pages (list, role/status toggle)

### Mobile (mobile/)
- Flutter scaffold with Riverpod + go_router
- `ApiService` with dio + JWT injection
- `AuthService` with SharedPreferences token persistence
- Auth guard in router (`RouterNotifier`)
- Bottom nav with `StatefulShellRoute`
- All boilerplate providers in `mobile/lib/providers/`

---

## What's Project-Specific

Only these pieces need to change for a new project:

- **Database schema**: `backend/src/db/migrations/` (delete habit migrations, write yours)
- **Domain models**: `backend/src/controllers/`, `backend/src/routes/` (beyond auth), `backend/src/schemas/`
- **Flutter screens**: `mobile/lib/screens/` (delete habit/log screens, write yours)
- **Flutter providers**: `mobile/lib/providers/` (delete habit/log providers, keep auth)
- **go_router routes**: `mobile/lib/router.dart` (keep auth routes, replace feature routes)
- **Admin pages**: `admin/src/pages/` (keep auth + user management, replace feature pages)
- **Domain name**: `habit-api.stuff187.com` → your subdomain
- **Admin domain**: `habit-admin.stuff187.com` → your subdomain

---

## Step-by-Step: New Project From This Pattern

### 1. Clone the repo
```bash
git clone https://github.com/daedmaet187/wotsan-habit-tracker.git your-new-project
cd your-new-project
git remote set-url origin https://github.com/your-github-username/your-new-project.git
```

### 2. Find-and-replace across all files

Run these in order:

```bash
# Project name
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.jsx" -o -name "*.tf" -o -name "*.hcl" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.md" -o -name "*.dart" -o -name "*.toml" \) \
  -exec sed -i 's/wotsan-habit-tracker/your-project-name/g' {} +

# Domain
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.jsx" -o -name "*.tf" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.md" -o -name "*.dart" \) \
  -exec sed -i 's/stuff187\.com/your-domain.com/g' {} +

# GitHub username
find . -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.md" \) \
  -exec sed -i 's/daedmaet187/your-github-username/g' {} +

# API subdomain
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tf" -o -name "*.yml" -o -name "*.yaml" -o -name "*.dart" -o -name "*.md" \) \
  -exec sed -i 's/habit-api/your-api-subdomain/g' {} +

# Admin subdomain
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tf" -o -name "*.yml" -o -name "*.yaml" -o -name "*.dart" -o -name "*.md" \) \
  -exec sed -i 's/habit-admin/your-admin-subdomain/g' {} +

# AWS region (if not eu-central-1)
find . -type f \( -name "*.tf" -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" \) \
  -exec sed -i 's/eu-central-1/your-preferred-region/g' {} +

# OpenTofu state bucket
find . -type f \( -name "*.tf" -o -name "*.md" \) \
  -exec sed -i 's/wotsan-opentofu-state/your-state-bucket-name/g' {} +

# S3 admin bucket
find . -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.tf" -o -name "*.md" \) \
  -exec sed -i 's/wotsan-habit-admin/your-admin-s3-bucket/g' {} +
```

### 3. Replace database schema
```bash
# Delete habit migrations, write your schema
rm backend/src/db/migrations/002_create_habits.sql
rm backend/src/db/migrations/003_create_habit_logs.sql
# Write: backend/src/db/migrations/002_create_your_table.sql
```

### 4. Replace backend domain logic
```bash
# Keep: authController.js, authMiddleware.js, usersController.js (GET /me)
# Delete: habitsController.js, logsController.js, adminHabitsController.js
# Delete: routes/habits.js, routes/logs.js
# Write: your controllers and routes
```

### 5. Replace Flutter screens
```bash
# Keep: mobile/lib/screens/auth/ (login, register)
# Delete: mobile/lib/screens/habits/, mobile/lib/screens/logs/, mobile/lib/screens/stats/
# Write: mobile/lib/screens/your-feature/
```

### 6. Update go_router routes
Edit `mobile/lib/router.dart`:
- Keep auth routes (`/login`, `/register`)
- Replace feature routes with your app's routes
- Update `StatefulShellRoute` branches for your bottom nav items

### 7. Replace admin pages
```bash
# Keep: admin/src/pages/Login.jsx, admin/src/pages/Users.jsx
# Delete: admin/src/pages/Habits.jsx, admin/src/pages/Analytics.jsx
# Write: admin/src/pages/YourFeature.jsx
```

### 8. Update CI/CD build env vars
In `.github/workflows/admin.yml`:
```yaml
env:
  VITE_API_URL: https://your-api-subdomain.your-domain.com
```

In `.github/workflows/mobile.yml`:
```yaml
flutter build apk --release --dart-define=API_URL=https://your-api-subdomain.your-domain.com
```

### 9. Create new CloudFront distribution
The old CloudFront distribution ID `E2ZTBWJSRJ2RVI` is project-specific. Create a new one for your project and update `admin.yml`.

### 10. Set all GitHub secrets
Follow SECRETS.md for the new project's secrets.

### 11. Push and follow Runbook 6
```bash
git add .
git commit -m "chore: initialize from wotsan-habit-tracker template"
git push origin main
```
Then follow DEPLOY.md → Runbook 6 (First-time Setup).

---

## Infra Extension Points

### Add another ECS service (e.g., a worker)
Add a new instance of the `ecs` module in `infra/main.tf` with a different service name and container config. The module is parameterized for exactly this.

### Add Redis (ElastiCache)
Create `infra/modules/elasticache/` following the same pattern as `rds/`. Add security group allowing ECS SG access on port 6379. Pass the Redis endpoint as an ECS env var.

### Add S3 for file uploads
In `infra/modules/ecs/main.tf`, add an IAM policy to the ECS task role:
```hcl
resource "aws_iam_role_policy" "ecs_s3_access" {
  role = aws_iam_role.ecs_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
      Resource = "arn:aws:s3:::your-uploads-bucket/*"
    }]
  })
}
```

### Scale ECS horizontally
In `infra/modules/ecs/variables.tf`, change `desired_count` variable default from `1` to your target. Add Application Auto Scaling resources to the ECS module for dynamic scaling.

### Add a staging environment
Create `infra/environments/staging/` with its own `main.tf` that calls the same modules with different variable values (different project name prefix, smaller RDS instance, etc.).

---

## What NOT to Change Without Reading ADRs First

These things look like they could be "improved" but were chosen deliberately:

| Thing | ADR to read first |
|---|---|
| ESM format (`import`/`export`) | ADR-002 |
| Express 5 (not Express 4) | ADR-001 |
| Zod schemas on all routes | ADR-003 |
| No try/catch in controllers | ADR-001 |
| OpenTofu modules structure | ADR-010 |
| TailwindCSS 4 (no `tailwind.config.js`) | ADR-007 |
| ConsumerStatefulWidget in Flutter | ADR-008 |
| `context.go()` for navigation | ADR-009 |
| JWT with no token revocation | ADR-011 |
| ECS Fargate (not Lambda) | ADR-004 |
