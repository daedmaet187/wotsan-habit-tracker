# Architecture: wotsan-habit-tracker

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│  ┌─────────────────┐          ┌──────────────────────────────┐  │
│  │  Flutter Mobile  │         │       Admin SPA              │  │
│  │  (iOS + Android) │         │  React 19 + Vite 6           │  │
│  └────────┬────────┘          └──────────────┬───────────────┘  │
└───────────┼───────────────────────────────────┼─────────────────┘
            │ HTTPS                              │ HTTPS
            │                                   │
            │              ┌────────────────────┘
            │              │ habit-admin.stuff187.com
            │              │ (S3 + CloudFront E2ZTBWJSRJ2RVI)
            │              │
            │ habit-api.stuff187.com
            │ (Cloudflare DNS → CNAME → ALB, proxied=false)
            │
            ▼
┌───────────────────────────┐
│  AWS ALB (eu-central-1)   │
│  public subnets           │
└────────────┬──────────────┘
             │ port 3000
             ▼
┌───────────────────────────────────────┐
│  AWS ECS Fargate                      │
│  wotsan-habit-tracker-cluster         │
│  Task: 256 CPU / 512 MB               │
│  Node.js + Express 5 (ESM)            │
│  Container port: 3000                 │
└──────────────────┬────────────────────┘
                   │ private subnet
                   ▼
┌───────────────────────────────────────┐
│  AWS RDS PostgreSQL                   │
│  private subnet                       │
│  accessed via DATABASE_URL            │
└───────────────────────────────────────┘

DNS: Cloudflare zone stuff187.com
     habit-api CNAME → ALB DNS name (proxied=false)
IaC: OpenTofu (infra/) → GitHub Actions infra.yml
ECR: wotsan-habit-tracker-api (container image registry)
```

---

## Request Flow

**User opens mobile app and logs a habit:**

1. Flutter app starts → reads JWT from SharedPreferences
2. If JWT present → attaches as `Authorization: Bearer <token>` header
3. dio sends `POST https://habit-api.stuff187.com/api/logs`
4. DNS resolves via Cloudflare → CNAME → ALB DNS → ALB in eu-central-1
5. ALB forwards to ECS task on port 3000 (target group health: GET /health)
6. Express 5 receives request → authMiddleware validates JWT
7. authMiddleware decodes token → attaches `req.user` (id, email, role)
8. Route handler calls Zod schema validation on body
9. pg query executes INSERT into habit_logs (private RDS)
10. Response: `201 Created` with log record JSON
11. Flutter Riverpod provider invalidates → UI re-renders with new streak

**Admin views user list:**

1. Admin opens https://habit-admin.stuff187.com → CloudFront serves index.html from S3
2. React app boots → reads JWT from localStorage
3. @tanstack/react-query fires `GET https://habit-api.stuff187.com/api/admin/users`
4. Same ALB → ECS path as above
5. authMiddleware checks JWT role === 'admin' — 403 if not
6. adminController queries users table, returns paginated list

---

## Components

| Component | Tech | Host | URL / Endpoint |
|---|---|---|---|
| Flutter mobile | Flutter 3.x stable, flutter_riverpod 2.6.1, go_router 14.x | iOS + Android | n/a |
| Backend API | Node.js v20, Express 5, ESM, Zod | AWS ECS Fargate (eu-central-1) | https://habit-api.stuff187.com |
| Admin dashboard | React 19, Vite 6, TailwindCSS 4, shadcn/ui | S3 + CloudFront (E2ZTBWJSRJ2RVI) | https://habit-admin.stuff187.com |
| Database | PostgreSQL (AWS RDS) | AWS eu-central-1, private subnet | private — accessed via DATABASE_URL |
| Container registry | AWS ECR | AWS eu-central-1 | wotsan-habit-tracker-api |
| Load balancer | AWS ALB | AWS eu-central-1, public subnets | → ECS tasks port 3000 |
| IaC | OpenTofu (Terraform fork) | GitHub Actions (infra.yml) | infra/ directory |
| DNS | Cloudflare | zone: stuff187.com | CNAME habit-api → ALB (proxied=false) |

---

## Data Model

### users
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, default gen_random_uuid() |
| email | varchar(255) | UNIQUE, NOT NULL |
| password_hash | text | NOT NULL |
| full_name | varchar(255) | NOT NULL |
| role | varchar(20) | NOT NULL, default 'user', CHECK IN ('user','admin') |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

### habits
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, default gen_random_uuid() |
| user_id | uuid | FK → users(id) ON DELETE CASCADE |
| name | varchar(255) | NOT NULL |
| description | text | nullable |
| color | varchar(7) | NOT NULL (hex, e.g. #FF5733) |
| icon | varchar(100) | NOT NULL |
| frequency | varchar(20) | NOT NULL, CHECK IN ('daily','weekly','monthly') |
| target_days | integer | NOT NULL, default 7 |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

### habit_logs
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, default gen_random_uuid() |
| habit_id | uuid | FK → habits(id) ON DELETE CASCADE |
| user_id | uuid | FK → users(id) ON DELETE CASCADE |
| logged_date | date | NOT NULL |
| note | text | nullable |
| created_at | timestamptz | NOT NULL, default now() |
| — | — | UNIQUE (habit_id, logged_date) |

---

## API Surface

### Auth Routes (`/api/auth`)
| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Register new user. Body: {email, password, full_name} |
| POST | /api/auth/login | No | Login. Body: {email, password}. Returns JWT. |

### Habit Routes (`/api/habits`)
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | /api/habits | JWT | List all habits for authenticated user |
| POST | /api/habits | JWT | Create habit. Body: {name, description?, color, icon, frequency, target_days?} |
| PUT | /api/habits/:id | JWT | Update habit. Body: partial habit fields |
| DELETE | /api/habits/:id | JWT | Soft delete habit (sets is_active=false) |

### Log Routes (`/api/logs`)
| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | /api/logs | JWT | Log a habit. Body: {habit_id, logged_date, note?} |
| GET | /api/logs?date=YYYY-MM-DD | JWT | Get all logs for user on a specific date |
| GET | /api/logs/range?from=YYYY-MM-DD&to=YYYY-MM-DD | JWT | Get logs for date range |
| GET | /api/logs/streaks | JWT | Get current streak per habit (SQL window functions) |
| DELETE | /api/logs/:id | JWT | Delete a log entry |

### User Routes (`/api/users`)
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | /api/users/me | JWT | Get authenticated user's profile |

### Admin Routes (`/api/admin`) — role=admin required
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | /api/admin/users | JWT + admin | List all users |
| GET | /api/admin/habits | JWT + admin | List all habits across all users |
| GET | /api/admin/stats | JWT + admin | Aggregate stats: total users, habits, logs |
| GET | /api/admin/analytics | JWT + admin | Time-series analytics data |
| GET | /api/admin/activity | JWT + admin | Recent activity feed |
| PATCH | /api/admin/users/:id/role | JWT + admin | Change user role. Body: {role: 'user'|'admin'} |
| PATCH | /api/admin/users/:id/status | JWT + admin | Toggle is_active. Body: {is_active: boolean} |
| DELETE | /api/admin/users/:id | JWT + admin | Delete user and cascade |

### Health Check
| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | /health | No | ALB health check. Returns: `{"status":"ok"}` |

---

## Auth Flow

1. Client POSTs credentials to `/api/auth/login`
2. API bcrypt-compares password, issues JWT (signed with JWT_SECRET, 7d expiry)
3. JWT payload: `{ id, email, role, iat, exp }`
4. Client stores token:
   - Mobile: `SharedPreferences` (key: `auth_token`)
   - Admin SPA: `localStorage` (key: `auth_token`)
5. All protected requests include header: `Authorization: Bearer <token>`
6. `authMiddleware.js` verifies token → attaches `req.user`
7. Admin routes additionally check `req.user.role === 'admin'` → 403 if not
8. Token refresh: not implemented — user re-logs after 7 days
