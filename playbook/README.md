# Playbook: wotsan-habit-tracker

## What This Is

This is a **machine-readable context package** — not a wiki. Read it at session start to understand the entire system without asking questions. Every file is structured for scanning, not reading.

## How to Use

1. Read this file first (30 seconds).
2. Jump to the file that answers your immediate question (see File Map below).
3. Execute. Don't guess.

---

## Project Identity

| Field | Value |
|---|---|
| Project name | wotsan-habit-tracker |
| GitHub repo | daedmaet187/wotsan-habit-tracker |
| Owner | Master |
| API URL | https://habit-api.stuff187.com |
| Admin URL | https://habit-admin.stuff187.com |
| AWS Region | eu-central-1 |
| Flutter targets | iOS, Android |
| DNS zone | stuff187.com (Cloudflare) |

---

## File Map

| File | Answers |
|---|---|
| `README.md` | What is this? Where do I start? |
| `ARCHITECTURE.md` | How does the system fit together? What are all the components, routes, and data models? |
| `STACK.md` | What tech is used? What version? Why was it chosen? |
| `INFRA.md` | How is AWS/Cloudflare infrastructure defined? What are the OpenTofu modules? |
| `SECRETS.md` | What secrets exist? Where are they stored? What format? |
| `DEPLOY.md` | How do I deploy each layer? Step-by-step runbooks. |
| `DECISIONS.md` | Why were specific tech choices made? (Read before "improving" anything.) |
| `EXTEND.md` | How do I clone this pattern for a new project? |
| `agents/WATSON.md` | Watson's role, responsibilities, and delegation protocol. |
| `agents/CODEX.md` | Codex's role, layer-specific rules, and verification commands. |

---

## Start Here

### Fresh Build (zero to running)
1. Read `SECRETS.md` — set all GitHub secrets
2. Read `INFRA.md` — understand state backend setup
3. Follow `DEPLOY.md` → Runbook 6 (First-time Setup) step by step

### Debugging a Layer
- Backend issue → `ARCHITECTURE.md` (API Surface) + `DEPLOY.md` (Runbook 1 verify/rollback)
- Admin issue → `ARCHITECTURE.md` (components) + `DEPLOY.md` (Runbook 2)
- Infra issue → `INFRA.md` (modules + state) + `DEPLOY.md` (Runbook 3)
- Mobile issue → `ARCHITECTURE.md` (auth flow) + `STACK.md` (Flutter packages)
- Database issue → `ARCHITECTURE.md` (Data Model) + `DEPLOY.md` (Runbook 4)

### Extending the Project
→ Read `EXTEND.md` for the full template extraction guide.

### Understanding a Specific Component
→ Read `ARCHITECTURE.md` (components table + request flow).
→ Read `STACK.md` for the tech behind that component.
→ Read `DECISIONS.md` before changing any fundamental tech choice.

### Agent Role Assignments
- Watson (orchestrator): read `agents/WATSON.md`
- Codex (implementer): read `agents/CODEX.md`
