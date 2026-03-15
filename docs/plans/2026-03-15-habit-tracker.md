# Habit Tracker - Full Project Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully automated, production-ready Habit Tracker with Flutter mobile app, Node.js backend, React + shadcn/ui admin dashboard, PostgreSQL database, deployed on AWS + Cloudflare via OpenTofu.

**Architecture:** Flutter mobile app talks to a Node.js REST API running on AWS ECS (Fargate), backed by PostgreSQL on AWS RDS. Admin dashboard is a React + shadcn/ui SPA deployed on Cloudflare Pages. All infra is managed via OpenTofu. CI/CD via GitHub Actions.

**Tech Stack:** Flutter (iOS + Android), Node.js + Express, PostgreSQL, React + shadcn/ui + Vite, OpenTofu, Docker, GitHub Actions, AWS (ECS Fargate + RDS + ECR + ALB), Cloudflare (Pages + DNS)

---

## Overview

### Subdomains
- API: `habit-api.stuff187.com`
- Admin: `habit-admin.stuff187.com`

### Repo
- GitHub: `wotsan-habit-tracker` (under `daedmaet187`)

### AWS Resources
- ECR: container registry for API image
- ECS Fargate: runs API containers
- RDS PostgreSQL: database (eu-central-1)
- ALB: load balancer for API
- ACM: SSL cert for `habit-api.stuff187.com`

### Cloudflare Resources
- Pages: admin dashboard
- DNS: CNAME for API (→ ALB) + Pages deployment

---

## Phase 1: Project Scaffold & Repo

### Task 1: Create GitHub Repo

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.github/workflows/.keep`

**Step 1: Create repo via GitHub API**
```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{
    "name": "wotsan-habit-tracker",
    "description": "Habit Tracker - Flutter + Node.js + React + OpenTofu",
    "private": false,
    "auto_init": true
  }'
```
Expected: 201 Created with repo URL

**Step 2: Clone locally**
```bash
cd ~/.openclaw/workspace
git clone https://github.com/daedmaet187/wotsan-habit-tracker.git
cd wotsan-habit-tracker
```

**Step 3: Commit**
```bash
git add .
git commit -m "chore: initial project scaffold"
git push origin main
```

---

### Task 2: Project Directory Structure

**Step 1: Create folders**
```bash
mkdir -p backend/src/{routes,controllers,models,middleware,utils,config}
mkdir -p backend/src/db/{migrations,seeds}
mkdir -p admin/src/{components,pages,hooks,lib,api}
mkdir -p mobile/lib/{screens,widgets,services,models,utils}
mkdir -p infra/{modules/{ecr,ecs,rds,alb,acm,cloudflare},envs/prod}
mkdir -p .github/workflows
mkdir -p docs/plans
```

**Step 2: Commit structure**
```bash
git add .
git commit -m "chore: project directory structure"
git push origin main
```

---

## Phase 2: Backend (Node.js + Express + PostgreSQL)

### Task 3: Backend Bootstrap

**Files:**
- Create: `backend/package.json`
- Create: `backend/src/index.js`
- Create: `backend/.env.example`
- Create: `backend/Dockerfile`

**Step 1: Init Node project**
```bash
cd backend
npm init -y
npm install express pg dotenv bcryptjs jsonwebtoken cors helmet morgan uuid
npm install -D nodemon
```

**Step 2: Create `backend/src/index.js`**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
```

**Step 3: Create `backend/.env.example`**
```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/habittracker
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

**Step 4: Create `backend/Dockerfile`**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]
```

**Step 5: Commit**
```bash
git add backend/
git commit -m "feat(backend): bootstrap express server"
git push origin main
```

---

### Task 4: Database Schema & Migrations

**Files:**
- Create: `backend/src/db/migrations/001_create_users.sql`
- Create: `backend/src/db/migrations/002_create_habits.sql`
- Create: `backend/src/db/migrations/003_create_habit_logs.sql`
- Create: `backend/src/db/migrate.js`
- Create: `backend/src/config/db.js`

**Step 1: Create `backend/src/config/db.js`**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
```

**Step 2: Create migrations**

`001_create_users.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

`002_create_habits.sql`:
```sql
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50),
  frequency VARCHAR(50) DEFAULT 'daily',
  target_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
```

`003_create_habit_logs.sql`:
```sql
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_habit_logs_unique ON habit_logs(habit_id, logged_date);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, logged_date);
```

**Step 3: Create `backend/src/db/migrate.js`**
```javascript
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
  }
  console.log('All migrations complete.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
```

**Step 4: Commit**
```bash
git add backend/
git commit -m "feat(backend): database schema and migrations"
git push origin main
```

---

### Task 5: Auth Routes (Register + Login)

**Files:**
- Create: `backend/src/controllers/authController.js`
- Create: `backend/src/routes/auth.js`
- Create: `backend/src/middleware/auth.js`

**Step 1: Create `backend/src/controllers/authController.js`**
```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, role',
      [email, hash, full_name]
    );
    const token = jwt.sign({ id: rows[0].id, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({ user: rows[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const { password_hash, ...user } = rows[0];
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

**Step 2: Create `backend/src/middleware/auth.js`**
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Step 3: Create `backend/src/routes/auth.js`**
```javascript
const router = require('express').Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);

module.exports = router;
```

**Step 4: Commit**
```bash
git add backend/
git commit -m "feat(backend): auth routes - register and login"
git push origin main
```

---

### Task 6: Habits & Logs CRUD Routes

**Files:**
- Create: `backend/src/controllers/habitsController.js`
- Create: `backend/src/controllers/logsController.js`
- Create: `backend/src/routes/habits.js`
- Create: `backend/src/routes/logs.js`
- Create: `backend/src/routes/users.js`

**Step 1: Create `backend/src/controllers/habitsController.js`**
```javascript
const pool = require('../config/db');

exports.getAll = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
};

exports.create = async (req, res) => {
  const { name, description, color, icon, frequency, target_days } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO habits (user_id, name, description, color, icon, frequency, target_days) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [req.user.id, name, description, color, icon, frequency, target_days]
  );
  res.status(201).json(rows[0]);
};

exports.update = async (req, res) => {
  const { name, description, color, icon, frequency, target_days } = req.body;
  const { rows } = await pool.query(
    'UPDATE habits SET name=$1, description=$2, color=$3, icon=$4, frequency=$5, target_days=$6, updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING *',
    [name, description, color, icon, frequency, target_days, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Habit not found' });
  res.json(rows[0]);
};

exports.remove = async (req, res) => {
  await pool.query('UPDATE habits SET is_active=false WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.status(204).send();
};
```

**Step 2: Create `backend/src/controllers/logsController.js`**
```javascript
const pool = require('../config/db');

exports.log = async (req, res) => {
  const { habit_id, logged_date, note } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO habit_logs (habit_id, user_id, logged_date, note) VALUES ($1,$2,$3,$4) ON CONFLICT (habit_id, logged_date) DO UPDATE SET note=$4 RETURNING *',
      [habit_id, req.user.id, logged_date, note]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByDate = async (req, res) => {
  const { date } = req.query;
  const { rows } = await pool.query(
    'SELECT hl.*, h.name, h.color, h.icon FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id WHERE hl.user_id=$1 AND hl.logged_date=$2',
    [req.user.id, date]
  );
  res.json(rows);
};

exports.getStreak = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT habit_id, COUNT(*) as streak FROM (
      SELECT habit_id, logged_date,
        logged_date - ROW_NUMBER() OVER (PARTITION BY habit_id ORDER BY logged_date)::int AS grp
      FROM habit_logs WHERE user_id=$1
    ) t GROUP BY habit_id, grp ORDER BY streak DESC`,
    [req.user.id]
  );
  res.json(rows);
};
```

**Step 3: Wire up routes**

`backend/src/routes/habits.js`:
```javascript
const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/habitsController');
router.get('/', auth, c.getAll);
router.post('/', auth, c.create);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);
module.exports = router;
```

`backend/src/routes/logs.js`:
```javascript
const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/logsController');
router.post('/', auth, c.log);
router.get('/', auth, c.getByDate);
router.get('/streaks', auth, c.getStreak);
module.exports = router;
```

`backend/src/routes/users.js`:
```javascript
const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, full_name, role, created_at FROM users WHERE id=$1', [req.user.id]);
  res.json(rows[0]);
});
module.exports = router;
```

**Step 4: Commit**
```bash
git add backend/
git commit -m "feat(backend): habits and logs CRUD routes"
git push origin main
```

---

## Phase 3: Admin Dashboard (React + Vite + shadcn/ui)

### Task 7: Admin Bootstrap

**Files:**
- Create: `admin/` (Vite React project)
- Create: `admin/src/lib/api.js`

**Step 1: Scaffold Vite + React**
```bash
cd admin
npm create vite@latest . -- --template react
npm install
npx shadcn-ui@latest init
npm install @tanstack/react-query axios react-router-dom recharts lucide-react
```

**Step 2: shadcn init config**
- Style: Default
- Base color: Slate
- CSS variables: yes

**Step 3: Install shadcn components**
```bash
npx shadcn-ui@latest add button card table badge input dialog sheet sidebar navigation-menu chart
```

**Step 4: Create `admin/src/lib/api.js`**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
```

**Step 5: Commit**
```bash
git add admin/
git commit -m "feat(admin): bootstrap React + shadcn/ui dashboard"
git push origin main
```

---

### Task 8: Admin Pages

**Files:**
- Create: `admin/src/pages/Login.jsx`
- Create: `admin/src/pages/Dashboard.jsx`
- Create: `admin/src/pages/Users.jsx`
- Create: `admin/src/pages/Habits.jsx`
- Create: `admin/src/components/Layout.jsx`

**Step 1: Login page, Dashboard overview, Users table, Habits table**
- Login → JWT stored in localStorage, redirect to `/dashboard`
- Dashboard → stats cards (total users, total habits, logs today) + line chart (activity over 7 days)
- Users → paginated table with search, active/inactive toggle
- Habits → all habits across all users, filter by user

**Step 2: Layout with shadcn Sidebar**
- Sidebar: Dashboard, Users, Habits, Settings links
- Header: breadcrumb + logout button

**Step 3: Commit**
```bash
git add admin/
git commit -m "feat(admin): dashboard pages and layout"
git push origin main
```

---

## Phase 4: Flutter Mobile App

### Task 9: Flutter Bootstrap

**Files:**
- Create: `mobile/` (Flutter project)
- Create: `mobile/lib/services/api_service.dart`
- Create: `mobile/lib/models/habit.dart`

**Step 1: Create Flutter project**
```bash
flutter create mobile --org com.stuff187 --project-name habit_tracker
cd mobile
flutter pub add dio shared_preferences flutter_riverpod go_router intl
```

**Step 2: Create `mobile/lib/models/habit.dart`**
```dart
class Habit {
  final String id;
  final String name;
  final String? description;
  final String color;
  final String? icon;
  final String frequency;
  final int targetDays;
  final DateTime createdAt;

  Habit({required this.id, required this.name, this.description,
    required this.color, this.icon, required this.frequency,
    required this.targetDays, required this.createdAt});

  factory Habit.fromJson(Map<String, dynamic> j) => Habit(
    id: j['id'], name: j['name'], description: j['description'],
    color: j['color'] ?? '#6366f1', icon: j['icon'],
    frequency: j['frequency'], targetDays: j['target_days'],
    createdAt: DateTime.parse(j['created_at']),
  );
}
```

**Step 3: Create `mobile/lib/services/api_service.dart`**
```dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const baseUrl = String.fromEnvironment('API_URL', defaultValue: 'https://habit-api.stuff187.com');
  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login', data: {'email': email, 'password': password});
    return res.data;
  }

  Future<List<dynamic>> getHabits() async {
    final res = await _dio.get('/api/habits');
    return res.data;
  }

  Future<void> logHabit(String habitId, String date) async {
    await _dio.post('/api/logs', data: {'habit_id': habitId, 'logged_date': date});
  }
}
```

**Step 4: Commit**
```bash
git add mobile/
git commit -m "feat(mobile): Flutter bootstrap with models and API service"
git push origin main
```

---

### Task 10: Flutter Screens

**Files:**
- Create: `mobile/lib/screens/login_screen.dart`
- Create: `mobile/lib/screens/home_screen.dart`
- Create: `mobile/lib/screens/habit_detail_screen.dart`
- Create: `mobile/lib/screens/add_habit_screen.dart`

**Step 1: Screens**
- Login → email/password form, JWT storage
- Home → today's habits list, checkmark to log, streak counter
- Habit detail → history calendar, streak chart
- Add habit → name, color picker, frequency

**Step 2: Navigation via go_router**
- `/login` → LoginScreen
- `/` → HomeScreen (guarded)
- `/habit/:id` → HabitDetailScreen
- `/add` → AddHabitScreen

**Step 3: Commit**
```bash
git add mobile/
git commit -m "feat(mobile): Flutter screens and navigation"
git push origin main
```

---

## Phase 5: Infrastructure (OpenTofu)

### Task 11: OpenTofu Core Modules

**Files:**
- Create: `infra/main.tf`
- Create: `infra/variables.tf`
- Create: `infra/outputs.tf`
- Create: `infra/modules/ecr/main.tf`
- Create: `infra/modules/rds/main.tf`
- Create: `infra/modules/ecs/main.tf`
- Create: `infra/modules/alb/main.tf`
- Create: `infra/modules/cloudflare/main.tf`

**Step 1: Create `infra/variables.tf`**
```hcl
variable "aws_region" { default = "eu-central-1" }
variable "project" { default = "habit-tracker" }
variable "db_password" { sensitive = true }
variable "cf_dns_token" { sensitive = true }
variable "jwt_secret" { sensitive = true }
```

**Step 2: Create `infra/main.tf`**
```hcl
tofu {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
  backend "s3" {
    bucket = "wotsan-opentofu-state"
    key    = "habit-tracker/opentofu.tfstate"
    region = "eu-central-1"
  }
}

provider "aws" { region = var.aws_region }
provider "cloudflare" { api_token = var.cf_dns_token }

module "ecr"        { source = "./modules/ecr";  project = var.project }
module "rds"        { source = "./modules/rds";  project = var.project; db_password = var.db_password }
module "alb"        { source = "./modules/alb";  project = var.project }
module "ecs"        { source = "./modules/ecs";  project = var.project; image_url = module.ecr.repository_url; db_url = module.rds.connection_string; jwt_secret = var.jwt_secret; alb_target_group_arn = module.alb.target_group_arn }
module "cloudflare" { source = "./modules/cloudflare"; alb_dns = module.alb.dns_name }
```

**Step 3: ECR module (`infra/modules/ecr/main.tf`)**
```hcl
resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}
output "repository_url" { value = aws_ecr_repository.api.repository_url }
```

**Step 4: RDS module (`infra/modules/rds/main.tf`)**
```hcl
resource "aws_db_instance" "postgres" {
  identifier        = "${var.project}-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  db_name           = "habittracker"
  username          = "habitadmin"
  password          = var.db_password
  skip_final_snapshot = true
  publicly_accessible = false
}
output "connection_string" {
  value = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/habittracker"
  sensitive = true
}
```

**Step 5: Cloudflare module (`infra/modules/cloudflare/main.tf`)**
```hcl
variable "alb_dns" {}

resource "cloudflare_record" "api" {
  zone_id = "5b4e910343402099233564343a994556"
  name    = "habit-api"
  value   = var.alb_dns
  type    = "CNAME"
  proxied = false
}
```

**Step 6: Commit**
```bash
git add infra/
git commit -m "feat(infra): OpenTofu modules for ECR, RDS, ECS, ALB, Cloudflare"
git push origin main
```

---

## Phase 6: CI/CD (GitHub Actions)

### Task 12: GitHub Actions Pipelines

**Files:**
- Create: `.github/workflows/backend.yml`
- Create: `.github/workflows/admin.yml`
- Create: `.github/workflows/infra.yml`

**Step 1: Backend pipeline (`.github/workflows/backend.yml`)**
```yaml
name: Backend CI/CD
on:
  push:
    branches: [main]
    paths: [backend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-central-1
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build & Push
        run: |
          IMAGE=${{ secrets.ECR_REGISTRY }}/habit-tracker-api:${{ github.sha }}
          docker build -t $IMAGE ./backend
          docker push $IMAGE
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster habit-tracker \
            --service habit-tracker-api \
            --force-new-deployment
```

**Step 2: Admin pipeline (`.github/workflows/admin.yml`)**
```yaml
name: Admin CI/CD
on:
  push:
    branches: [main]
    paths: [admin/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd admin && npm ci && npm run build
        env:
          VITE_API_URL: https://habit-api.stuff187.com
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_WORKERS_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: habit-admin
          directory: admin/dist
```

**Step 3: Infra pipeline (`.github/workflows/infra.yml`)**
```yaml
name: Infra CI/CD
on:
  push:
    branches: [main]
    paths: [infra/**]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - name: OpenTofu Init
        run: tofu -chdir=infra init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: OpenTofu Plan
        run: tofu -chdir=infra plan
      - name: OpenTofu Apply
        if: github.ref == 'refs/heads/main'
        run: tofu -chdir=infra apply -auto-approve
```

**Step 4: Add GitHub Secrets**
```bash
# Add via GitHub API
gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY_ID" -R daedmaet187/wotsan-habit-tracker
gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_ACCESS_KEY" -R daedmaet187/wotsan-habit-tracker
gh secret set CF_WORKERS_TOKEN --body "$CF_WORKERS_TOKEN" -R daedmaet187/wotsan-habit-tracker
gh secret set CF_DNS_TOKEN --body "$CF_DNS_TOKEN" -R daedmaet187/wotsan-habit-tracker
```

**Step 5: Commit**
```bash
git add .github/
git commit -m "feat(ci): GitHub Actions pipelines for backend, admin, infra"
git push origin main
```

---

## Phase 7: Bootstrap OpenTofu State & Deploy

### Task 13: Create S3 OpenTofu State Bucket

**Step 1: Create S3 bucket for state**
```bash
aws s3api create-bucket \
  --bucket wotsan-opentofu-state \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1

aws s3api put-bucket-versioning \
  --bucket wotsan-opentofu-state \
  --versioning-configuration Status=Enabled
```

**Step 2: OpenTofu init + apply**
```bash
cd infra
tofu init
tofu apply -var="db_password=<strong-password>" -var="cf_dns_token=$CF_DNS_TOKEN" -var="jwt_secret=<jwt-secret>"
```

**Step 3: Run DB migrations**
```bash
# After ECS is up, run migrations via ECS exec or task override
aws ecs run-task \
  --cluster habit-tracker \
  --task-definition habit-tracker-migrate \
  --overrides '{"containerOverrides": [{"name": "api", "command": ["node", "src/db/migrate.js"]}]}'
```

**Step 4: Verify**
- `curl https://habit-api.stuff187.com/health` → `{"status":"ok"}`
- `https://habit-admin.stuff187.com` → Admin login page

---

## Summary

| Phase | Component | Status |
|---|---|---|
| 1 | Repo + structure | ⬜ |
| 2 | Backend API | ⬜ |
| 3 | Admin Dashboard | ⬜ |
| 4 | Flutter Mobile | ⬜ |
| 5 | OpenTofu Infra | ⬜ |
| 6 | CI/CD Pipelines | ⬜ |
| 7 | Deploy | ⬜ |
