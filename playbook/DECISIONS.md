# Architecture Decision Records: wotsan-habit-tracker

Read this before changing any fundamental technology choice. These decisions were made deliberately.

---

## ADR-001: Express 5 over Express 4

**Status**: Accepted

**Context**: The backend needs an HTTP server framework. Express 4 requires `express-async-errors` package or explicit try/catch in every async route handler to propagate errors to the global error handler.

**Decision**: Use Express 5.

**Rationale**: Express 5 propagates async errors natively — `async` route handlers that throw or reject automatically call `next(err)`. This eliminates the need for `express-async-errors` and allows clean controllers with no try/catch.

**Consequences**: All controllers in `backend/src/controllers/` are plain `async` functions. Errors thrown propagate to `backend/src/middleware/errorHandler.js` automatically. Do NOT add try/catch in controllers — it breaks the error propagation pattern.

**Alternatives considered**: Express 4 with `express-async-errors` (rejected: extra dependency, easy to forget), Fastify (rejected: different ecosystem, Express patterns preferred for familiarity).

---

## ADR-002: ESM over CommonJS

**Status**: Accepted

**Context**: Node.js supports both CommonJS (`require`) and ES Modules (`import/export`). The project needed to choose a module format.

**Decision**: Use ESM throughout the backend (`"type": "module"` in `backend/package.json`).

**Rationale**: ESM is the modern Node.js standard. It enables top-level `await`, tree-shaking, and aligns with how admin and mobile code is written. Node.js 20+ has excellent ESM support.

**Consequences**: All backend files use `import`/`export`. No `require()` anywhere. File extensions must be explicit in imports (`import './routes/auth.js'` not `./routes/auth`). Dynamic imports are async.

**Alternatives considered**: CommonJS (rejected: legacy format, incompatible with top-level await), mixed (rejected: complex interop rules).

---

## ADR-003: Zod for Validation over joi/yup

**Status**: Accepted

**Context**: API routes that accept request bodies need input validation before hitting the database.

**Decision**: Use Zod for all request body validation and env variable validation.

**Rationale**: Zod is TypeScript-first with excellent error messages that include the field path and a human-readable message. Schemas are composable — a schema can extend another. Error output is structured and easy to format into API error responses.

**Consequences**: Every route that accepts a body has a corresponding Zod schema in `backend/src/schemas/`. Validation happens in route handlers or middleware before controllers. Zod `.parse()` throws on failure; catch in middleware and return 400.

**Alternatives considered**: joi (rejected: older API, verbose), yup (rejected: async-heavy, less predictable error structure), express-validator (rejected: decorator-style, not composable).

---

## ADR-004: ECS Fargate over Lambda

**Status**: Accepted

**Context**: The Node.js + Express 5 API needs to be hosted on AWS. Two primary options: Lambda functions or ECS Fargate containers.

**Decision**: Use ECS Fargate.

**Rationale**: Express is a persistent process model. Running it on Lambda requires frameworks like `serverless-http` that add complexity. ECS Fargate runs the Docker container as a long-running process — the same as local dev. No cold starts affecting API latency. Easier reasoning about state (connection pools, etc.).

**Consequences**: Minimum cost is always-on Fargate task (256 CPU / 512 MB). Not event-driven. Scaling requires ECS service scaling configuration (not currently set up — desired_count=1 for MVP).

**Alternatives considered**: Lambda + serverless-http (rejected: cold starts, Express mismatch, extra complexity), EC2 (rejected: must manage OS, patching, AMIs — Fargate is serverless compute).

---

## ADR-005: RDS PostgreSQL over DynamoDB

**Status**: Accepted

**Context**: The data model includes users, habits, and habit_logs with foreign key relationships. Streak calculation requires querying across habit_logs rows.

**Decision**: Use AWS RDS PostgreSQL.

**Rationale**: The habits/logs data model is inherently relational. Streak queries require SQL window functions (`LAG`, `DENSE_RANK`) to calculate consecutive logging days. Joins between habit_logs and habits are common. DynamoDB would require duplicating data or running multiple queries for what PostgreSQL handles in one.

**Consequences**: Database must be in a private subnet (security). Connection pooling via `pg.Pool`. Schema changes require migrations (manual process — see DEPLOY.md Runbook 4). RDS has a minimum cost even when idle.

**Alternatives considered**: DynamoDB (rejected: no joins, streak queries require application-side logic across potentially large datasets, eventual consistency), PlanetScale/Neon (rejected: not on AWS, adds external dependency).

---

## ADR-006: Admin SPA on S3 + CloudFront (Not Cloudflare Pages)

**Status**: Accepted

**Context**: The admin dashboard is a React SPA that needs global CDN delivery. Initial plan mentioned Cloudflare Pages.

**Decision**: Use AWS S3 + CloudFront distribution (`E2ZTBWJSRJ2RVI`), S3 bucket `wotsan-habit-admin`.

**Rationale**: The project is already heavily AWS-invested (ECS, RDS, ECR, ALB). Keeping the admin hosting in AWS simplifies IAM (single AWS credential set for all CI/CD). CloudFront provides global CDN with the same performance as Cloudflare Pages. The existing CI/CD (`aws s3 sync` + CloudFront invalidation) is straightforward.

**Consequences**: CloudFront distribution ID `E2ZTBWJSRJ2RVI` is referenced in `admin.yml`. Admin content goes to S3 bucket `wotsan-habit-admin`. Not Cloudflare Pages — do not attempt to deploy there.

**Alternatives considered**: Cloudflare Pages (rejected: would require separate auth token, extra service, no advantage over CloudFront for this use case).

---

## ADR-007: TailwindCSS 4 over TailwindCSS 3

**Status**: Accepted

**Context**: The admin dashboard needs a CSS framework. TailwindCSS 3 is the previous stable version; TailwindCSS 4 is the latest with breaking changes.

**Decision**: Use TailwindCSS 4 with the `@tailwindcss/vite` plugin.

**Rationale**: TailwindCSS 4 eliminates `tailwind.config.js` — configuration is done in CSS natively. The `@tailwindcss/vite` plugin replaces the entire PostCSS pipeline. shadcn/ui compatibility confirmed. Results in a simpler build setup with fewer config files.

**Consequences**: There is NO `tailwind.config.js` in the admin project. CSS configuration is in `admin/src/index.css`. PostCSS config is NOT needed. Utility classes work identically to v3 for standard usage.

**Alternatives considered**: TailwindCSS 3 (rejected: legacy PostCSS setup, config file overhead, not forward-looking), vanilla CSS (rejected: design consistency harder to maintain).

---

## ADR-008: flutter_riverpod over Provider/Bloc

**Status**: Accepted

**Context**: The Flutter app needs state management for auth state, habit list, habit logs, and UI state.

**Decision**: Use `flutter_riverpod` 2.6.1.

**Rationale**: Riverpod is type-safe (providers are typed at declaration), testable (can override providers in tests), has a clear code generation path (`riverpod_generator`), and integrates cleanly with `go_router` via `RouterNotifier`. Provider (v1) has tree-related issues. Bloc is verbose for this scale.

**Consequences**: All screens are `ConsumerStatefulWidget` + `ConsumerState` or `ConsumerWidget`. Services are accessed via `ref.read()`. `ProviderScope` wraps the app in `main.dart`. Providers live in `mobile/lib/providers/`.

**Alternatives considered**: Provider package (rejected: Widget-tree-dependent, not as composable), Bloc (rejected: boilerplate overhead for MVP scale, event/state files per feature), GetX (rejected: too magic, bad testing story).

---

## ADR-009: go_router over Navigator 2.0

**Status**: Accepted

**Context**: The Flutter app has a bottom navigation bar with 4 tabs. Each tab should preserve scroll/state when switching. Deep links need to work. Routes need to be declarative.

**Decision**: Use `go_router` 14.x.

**Rationale**: `StatefulShellRoute` preserves the state of each tab's navigator stack when switching bottom nav tabs — exactly what the app needs. Declarative route definitions in one file (`router.dart`). Native deep link support. Riverpod integration via `RouterNotifier` for auth redirect.

**Consequences**: All navigation uses `context.go('/route')` or `context.push('/route')`. Never use `Navigator.push()` or `Navigator.pushReplacement()`. Routes are defined in `mobile/lib/router.dart`.

**Alternatives considered**: Navigator 2.0 directly (rejected: verbose, boilerplate-heavy), auto_route (rejected: extra code generation dependency, go_router is now the Flutter team's recommended solution).

---

## ADR-010: OpenTofu over Terraform

**Status**: Accepted

**Context**: Infrastructure-as-code tool needed. Terraform is the industry standard but adopted the BSL license in August 2023.

**Decision**: Use OpenTofu (Terraform fork).

**Rationale**: OpenTofu is the open-source fork of Terraform maintained by the Linux Foundation. HCL syntax is identical — all modules, providers, and state are compatible. No BSL license concerns. The `tofu` CLI is a drop-in replacement for `terraform`.

**Consequences**: Use `tofu` CLI, not `terraform`. All HCL is identical. Provider versions are the same. State format is compatible — can migrate to/from Terraform if needed.

**Alternatives considered**: Terraform (rejected: BSL license restricts competitive use), Pulumi (rejected: different language model, TypeScript IaC adds complexity), CDK (rejected: AWS-only, not Cloudflare-compatible without plugins).

---

## ADR-011: JWT over Sessions

**Status**: Accepted

**Context**: The API serves both a mobile app (Flutter) and a web admin SPA. Authentication state must persist across app restarts.

**Decision**: Use JWT Bearer tokens with 7-day expiry. No server-side sessions.

**Rationale**: JWT is stateless — the API doesn't need to maintain session state or a session store. Mobile clients store the token in SharedPreferences; admin stores in localStorage. Works seamlessly across multiple ECS task instances (no sticky sessions needed). Simple to implement with `jsonwebtoken`.

**Consequences**: No token revocation (by design for MVP — once issued, JWT is valid until expiry). If a JWT is compromised, it's valid for up to 7 days. Role changes (e.g., admin promotion) don't take effect until the user's JWT expires and they re-login. Logout is client-side only (delete stored token).

**Alternatives considered**: Sessions with Redis (rejected: requires ElastiCache, adds infrastructure cost, stateful ECS), OAuth2 (rejected: over-engineered for MVP with no third-party login needed).

---

## ADR-012: Single Region (eu-central-1) Deployment

**Status**: Accepted

**Context**: AWS resources must be deployed to a region. Multi-region adds complexity and cost.

**Decision**: Deploy all AWS resources to `eu-central-1` (Frankfurt).

**Rationale**: Master's primary users are in Europe/Middle East. eu-central-1 provides low latency. Single region keeps cost and operational complexity minimal for MVP. The OpenTofu `aws_region` variable is parameterized for future multi-region expansion.

**Consequences**: All AWS resources (ECS, RDS, ECR, ALB, S3, CloudFront) are in eu-central-1. RDS backups are regional. No cross-region replication. If AWS has a regional outage, the service is down.

**Alternatives considered**: Multi-region active-active (rejected: complex DB replication, cost, premature for MVP), us-east-1 (rejected: higher latency for target users).
