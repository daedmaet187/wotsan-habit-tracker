# Stack: wotsan-habit-tracker

Read this before changing any dependency version or swapping a tool. Every choice here was deliberate.

---

## Backend (Node.js API)

### Node.js
- Version: 20 (LTS)
- Layer: backend
- Purpose: JavaScript runtime for the Express API server
- Why chosen: LTS stability, native ESM support, excellent pg/bcrypt ecosystem
- Key config: Dockerfile uses `node:20-alpine`; `.nvmrc` pins v20

### Express
- Version: 5.x
- Layer: backend
- Purpose: HTTP server framework handling routing, middleware, and error propagation
- Why chosen: Express 5 propagates async errors natively — no `express-async-errors` wrapper needed. See ADR-001.
- Key config: `backend/src/index.js` (entry point), `backend/src/app.js` (middleware setup)

### Zod
- Version: 3.x
- Layer: backend
- Purpose: Runtime schema validation for all request bodies and env variables
- Why chosen: TypeScript-first design, composable schemas, structured error output (path + message). See ADR-003.
- Key config: schemas in `backend/src/schemas/`

### express-rate-limit
- Version: 7.x
- Layer: backend
- Purpose: Rate limiting on auth routes (register/login) to prevent brute force
- Why chosen: Zero-dependency, Express middleware, configurable per-route
- Key config: configured in `backend/src/middleware/rateLimiter.js`

### compression
- Version: 1.x
- Layer: backend
- Purpose: Gzip response compression for all API responses
- Why chosen: Standard Express middleware, reduces bandwidth to mobile clients
- Key config: applied globally in `backend/src/app.js`

### pg
- Version: 8.x
- Layer: backend
- Purpose: PostgreSQL client — executes parameterized queries against RDS
- Why chosen: Industry standard for Node.js + PostgreSQL; no ORM overhead
- Key config: pool configured in `backend/src/db/pool.js`; connection via `DATABASE_URL`

### bcryptjs
- Version: 2.x
- Layer: backend
- Purpose: Password hashing and verification
- Why chosen: Pure JavaScript (no native bindings), compatible with Alpine Linux Docker image
- Key config: salt rounds = 10 in `backend/src/utils/auth.js`

### jsonwebtoken
- Version: 9.x
- Layer: backend
- Purpose: JWT signing and verification
- Why chosen: De facto standard, supports RS256/HS256, well-maintained
- Key config: `JWT_SECRET` + `JWT_EXPIRES_IN` env vars; logic in `backend/src/utils/auth.js`

### dotenv
- Version: 16.x
- Layer: backend
- Purpose: Load `.env` file into `process.env` for local development
- Why chosen: Standard approach; env vars injected directly in ECS (dotenv is a no-op in production)
- Key config: `backend/.env` (not committed); loaded at top of `backend/src/index.js`

### nodemon
- Version: 3.x
- Layer: backend (dev only)
- Purpose: Auto-restart server on file changes during local development
- Why chosen: Standard dev tool; only in `devDependencies`, not in Docker image
- Key config: `backend/nodemon.json`

---

## Admin Dashboard (React SPA)

### React
- Version: 19.x
- Layer: admin
- Purpose: UI framework for the admin dashboard SPA
- Why chosen: Latest stable, concurrent features, compatible with React Router 7 and React Query v5
- Key config: `admin/src/main.jsx` (entry), `admin/src/App.jsx` (root)

### Vite
- Version: 6.x
- Layer: admin
- Purpose: Build tool and dev server
- Why chosen: Fast HMR, native ESM, official TailwindCSS 4 plugin (`@tailwindcss/vite`)
- Key config: `admin/vite.config.js`

### TailwindCSS
- Version: 4.x
- Layer: admin
- Purpose: Utility-first CSS framework
- Why chosen: TailwindCSS 4 eliminates `tailwind.config.js` — CSS-native config via `@import`. See ADR-007.
- Key config: `admin/src/index.css` (CSS-native config)

### @tailwindcss/vite
- Version: 4.x
- Layer: admin
- Purpose: Vite plugin that integrates TailwindCSS 4 directly (replaces PostCSS pipeline)
- Why chosen: No PostCSS needed with TailwindCSS 4 + Vite — simpler build setup
- Key config: `admin/vite.config.js` → `plugins: [tailwindcss()]`

### shadcn/ui
- Version: latest (components, not npm package)
- Layer: admin
- Purpose: Pre-built UI components (Button, Dialog, Table, etc.) using Radix UI primitives
- Why chosen: Radix-based accessibility, copy-paste model (components are owned code in `admin/src/components/ui/`)
- Key config: components live in `admin/src/components/ui/` — edit directly, don't reinstall

### React Router
- Version: 7.x
- Layer: admin
- Purpose: Client-side routing for the SPA
- Why chosen: Latest stable, file-based routes optional, integrates with React 19
- Key config: `admin/src/router.jsx`

### @tanstack/react-query
- Version: 5.x
- Layer: admin
- Purpose: Server state management — all API calls go through React Query
- Why chosen: Caching, background refetch, mutation handling; no direct axios in components
- Key config: `admin/src/lib/queryClient.js`

### axios
- Version: 1.x
- Layer: admin
- Purpose: HTTP client used inside React Query query/mutation functions
- Why chosen: Interceptor support for auth header injection; cleaner than fetch for error handling
- Key config: `admin/src/lib/apiClient.js` (interceptor sets Authorization header)

### lucide-react
- Version: latest
- Layer: admin
- Purpose: Icon library
- Why chosen: Consistent icon set, React-native, tree-shakeable, used by shadcn/ui
- Key config: imported directly in components

### recharts
- Version: 2.x
- Layer: admin
- Purpose: Charts for analytics dashboard (line charts, bar charts)
- Why chosen: React-native, composable, works with Tailwind, adequate for admin analytics
- Key config: used in `admin/src/pages/Analytics.jsx`

### ESLint
- Version: 9.x (flat config)
- Layer: admin
- Purpose: JavaScript/JSX linting
- Why chosen: ESLint 9 with flat config is the new standard (no `.eslintrc.js`)
- Key config: `admin/eslint.config.js`

---

## Mobile (Flutter)

### Flutter
- Version: 3.x stable channel
- Layer: mobile
- Purpose: Cross-platform mobile framework for iOS and Android
- Why chosen: Single codebase for iOS + Android, Riverpod ecosystem, excellent animation support
- Key config: `mobile/pubspec.yaml`, SDK constraint `>=3.0.0`

### flutter_riverpod
- Version: 2.6.1
- Layer: mobile
- Purpose: State management — all providers, services, and state
- Why chosen: Type-safe, testable, integrates with go_router. See ADR-008.
- Key config: `mobile/lib/providers/` directory; `ProviderScope` wraps app in `main.dart`

### go_router
- Version: 14.x
- Layer: mobile
- Purpose: Declarative routing with StatefulShellRoute for bottom nav
- Why chosen: Deep link support, preserves bottom nav state, integrates with Riverpod. See ADR-009.
- Key config: `mobile/lib/router.dart`

### dio
- Version: 5.x
- Layer: mobile
- Purpose: HTTP client for API calls
- Why chosen: Interceptors for JWT injection, request/response transformation, error handling
- Key config: `mobile/lib/services/api_service.dart`; base URL from dart-define `API_URL`

### shared_preferences
- Version: 2.x
- Layer: mobile
- Purpose: Persistent key-value storage for JWT token
- Why chosen: Platform-native storage, official Flutter package, used for auth token only
- Key config: `mobile/lib/services/auth_service.dart` (key: `auth_token`)

### flutter_animate
- Version: 4.x
- Layer: mobile
- Purpose: Declarative animation extensions
- Why chosen: Clean API (`.animate().fadeIn()`), reduces boilerplate for UI transitions
- Key config: used in screens and widgets as needed

### fl_chart
- Version: 0.x
- Layer: mobile
- Purpose: Charts for habit streak visualization
- Why chosen: Rich chart types, Flutter-native, customizable
- Key config: used in `mobile/lib/screens/stats_screen.dart`

### confetti
- Version: 0.x
- Layer: mobile
- Purpose: Confetti animation on habit completion milestones
- Why chosen: Lightweight, fun UX touch, no dependencies
- Key config: used in habit log confirmation widget

### flutter_slidable
- Version: 3.x
- Layer: mobile
- Purpose: Swipe-to-delete/edit actions on list items
- Why chosen: Platform-native feel for habit list management
- Key config: used in habit list widgets

### intl
- Version: 0.19.x
- Layer: mobile
- Purpose: Date formatting and localization utilities
- Why chosen: Official Dart package, used for date display throughout the app
- Key config: date formatting in `mobile/lib/utils/date_utils.dart`

### flutter_lints
- Version: 5.0
- Layer: mobile
- Purpose: Lint rules for Dart/Flutter code
- Why chosen: Official Flutter lint package; rules defined in `mobile/analysis_options.yaml`
- Key config: `mobile/analysis_options.yaml`

---

## Infrastructure (AWS + Cloudflare)

### AWS ECS Fargate
- Version: n/a (managed service)
- Layer: infra
- Purpose: Runs the Node.js API container without managing EC2 instances
- Why chosen: Persistent process model (Express), no cold starts, simpler than Lambda. See ADR-004.
- Key config: `infra/modules/ecs/` — task definition, service, IAM

### AWS RDS PostgreSQL
- Version: PostgreSQL 15
- Layer: infra
- Purpose: Relational database for users, habits, and logs
- Why chosen: Relational model with joins required for streak queries (window functions). See ADR-005.
- Key config: `infra/modules/rds/`; accessed via `DATABASE_URL`

### AWS ECR
- Version: n/a (managed service)
- Layer: infra
- Purpose: Container image registry for the Node.js API Docker image
- Why chosen: Native AWS integration with ECS; no external registry needed
- Key config: `infra/modules/ecr/`; repo name: `wotsan-habit-tracker-api`

### AWS ALB
- Version: n/a (managed service)
- Layer: infra
- Purpose: HTTP/HTTPS load balancer routing traffic to ECS tasks
- Why chosen: Native ECS integration, health checks, ACM certificate termination
- Key config: `infra/modules/alb/`; target group port 3000

### AWS ACM
- Version: n/a (managed service)
- Layer: infra
- Purpose: TLS certificate for habit-api.stuff187.com
- Why chosen: Free, managed, auto-renewal, integrated with ALB
- Key config: `infra/modules/alb/` (certificate ARN referenced)

### AWS CloudWatch Logs
- Version: n/a (managed service)
- Layer: infra
- Purpose: ECS container log aggregation
- Why chosen: Native ECS log driver (`awslogs`); 7-day retention to control cost
- Key config: `infra/modules/ecs/`; log group `/ecs/wotsan-habit-tracker-api`

### Cloudflare (DNS)
- Version: n/a (managed service)
- Layer: infra
- Purpose: DNS for stuff187.com zone — CNAME habit-api → ALB
- Why chosen: Always Cloudflare for DNS per project standard. See ADR-010 (OpenTofu manages it).
- Key config: `infra/modules/cloudflare/`; `proxied=false` (ALB handles TLS)

### AWS S3 + CloudFront
- Version: n/a (managed service)
- Layer: infra
- Purpose: Hosts admin SPA — S3 for files, CloudFront for CDN delivery
- Why chosen: Actually S3+CloudFront (not Cloudflare Pages). See ADR-006.
- Key config: S3 bucket `wotsan-habit-admin`; CloudFront distribution `E2ZTBWJSRJ2RVI`

### OpenTofu
- Version: 1.x
- Layer: infra
- Purpose: Infrastructure-as-code for all AWS and Cloudflare resources
- Why chosen: Open-source Terraform fork, identical HCL, no BSL license. See ADR-010.
- Key config: `infra/main.tf`, modules in `infra/modules/`, state in S3

### Docker
- Version: 24.x+ (build-time only)
- Layer: backend/infra
- Purpose: Containerizes the Node.js API for ECS deployment
- Why chosen: Standard containerization; Alpine base keeps image small
- Key config: `backend/Dockerfile`

---

## CI/CD (GitHub Actions)

### backend.yml
- Purpose: Build Docker image, push to ECR, update ECS service
- Trigger: push to main affecting `backend/**`
- Key steps: docker build → ecr push → ecs register task def → ecs update service

### admin.yml
- Purpose: Build React SPA, deploy to S3, invalidate CloudFront
- Trigger: push to main affecting `admin/**`
- Key steps: npm ci → vite build → aws s3 sync → cloudfront invalidation

### infra.yml
- Purpose: Run OpenTofu plan + apply on infra changes
- Trigger: push to main affecting `infra/**`
- Key steps: tofu init → tofu plan → tofu apply

### mobile.yml
- Purpose: Build Flutter APK and upload as GitHub artifact
- Trigger: push to main affecting `mobile/**`
- Key steps: flutter pub get → flutter build apk --release → upload artifact
