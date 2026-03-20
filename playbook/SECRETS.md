# Secrets: wotsan-habit-tracker

Complete catalog of every secret and environment variable. Never log actual values. Never commit secrets to git.

---

## GitHub Repository Secrets

Set at: `https://github.com/daedmaet187/wotsan-habit-tracker/settings/secrets/actions`

| Name | Layer | Where stored | Description | Format / Example |
|---|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | All CI/CD | GitHub Actions secrets | IAM user access key for deployments | `AKIA...` (20 chars) |
| `AWS_SECRET_ACCESS_KEY` | All CI/CD | GitHub Actions secrets | IAM user secret key | 40-char alphanumeric string |
| `DB_PASSWORD` | infra CI | GitHub Actions secrets | RDS PostgreSQL master password | Min 8 chars, no special chars that break connection strings |
| `JWT_SECRET` | infra CI | GitHub Actions secrets | JWT signing secret | Min 32 chars, random string (e.g. `openssl rand -hex 32`) |
| `CF_DNS_TOKEN` | infra CI | GitHub Actions secrets | Cloudflare API token with Zone:Edit DNS | Cloudflare dashboard → API Tokens → create token |
| `CF_ZONE_ID` | infra CI | GitHub Actions secrets | Cloudflare zone ID for stuff187.com | 32-char hex string from Cloudflare zone overview |
| `ECR_REGISTRY_URL` | backend CI | GitHub Actions secrets | AWS ECR registry base URL | `123456789012.dkr.ecr.eu-central-1.amazonaws.com` |

**IAM permissions required for `AWS_ACCESS_KEY_ID`:**
- ECS: `ecs:RegisterTaskDefinition`, `ecs:UpdateService`, `ecs:DescribeServices`
- ECR: `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
- S3: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` (on `wotsan-habit-admin` bucket)
- CloudFront: `cloudfront:CreateInvalidation`
- OpenTofu state: `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` (on `wotsan-opentofu-state` bucket)

---

## Backend Runtime Environment Variables

Set in ECS task definition via OpenTofu (`infra/modules/ecs/main.tf`). Not in GitHub secrets directly — passed as OpenTofu variables and injected at task registration.

| Name | Description | Value in production |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:<DB_PASSWORD>@<rds-endpoint>:5432/habitdb` |
| `JWT_SECRET` | JWT signing secret (same as GitHub secret) | Min 32-char random string |
| `JWT_EXPIRES_IN` | JWT token lifetime | `7d` |
| `PORT` | Express server port | `3000` |
| `NODE_ENV` | Environment flag | `production` |

---

## Admin Build Environment Variables

Set in `admin.yml` GitHub Actions workflow at build time.

| Name | Description | Value |
|---|---|---|
| `VITE_API_URL` | Backend API base URL for Vite build | `https://habit-api.stuff187.com` |

Used in admin as: `import.meta.env.VITE_API_URL`
Set in workflow: `env: VITE_API_URL: https://habit-api.stuff187.com`

---

## Mobile Build Environment Variables

Passed as `--dart-define` flags at Flutter build time.

| Name | Description | Value |
|---|---|---|
| `API_URL` | Backend API base URL | `https://habit-api.stuff187.com` |

Used in mobile as: `const String apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://habit-api.stuff187.com');`

Build command: `flutter build apk --release --dart-define=API_URL=https://habit-api.stuff187.com`

---

## Local Development

### Backend
Create `backend/.env` (not committed — in `.gitignore`):
```
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/habitdb
JWT_SECRET=your-local-secret-min-32-chars-long
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

### Admin
No `.env` file needed for local dev. `VITE_API_URL` defaults to `http://localhost:3000` if not set, or create `admin/.env.local`:
```
VITE_API_URL=http://localhost:3000
```

### Mobile
No env file needed. Default `API_URL` in `api_service.dart` points to `http://10.0.2.2:3000` for Android emulator (maps to host `localhost`). Override with `--dart-define=API_URL=http://your-ip:3000` for physical device testing.

---

## Secret Rotation Procedure

1. Generate new value (e.g. `openssl rand -hex 32` for JWT_SECRET)
2. Update GitHub secret via Settings → Secrets
3. For JWT_SECRET: also re-apply infra (updates ECS task definition env var) → `gh workflow run infra.yml`
4. After new ECS tasks deploy, all existing tokens with old secret will be invalid — users must re-login
5. For DB_PASSWORD: update RDS instance password separately (AWS Console or CLI), then update GitHub secret, then re-apply infra
