# Axly DSA Tracker — CI/CD & Deployment

## GitHub Actions

### CI Workflow
**Trigger:** Push to `main` or `develop`, Pull Requests

**Steps:**
1. **Checkout** code
2. **Setup Node.js** 22
3. **Install backend dependencies**
4. **Run backend tests** (`npm test`)
5. **Install frontend dependencies**
6. **Build frontend** (`npm run build`)
7. **Run Playwright E2E tests** (if changed files include frontend/backend)

### CD Workflow
**Trigger:** Push to `main`

**Steps:**
1. **Deploy to Heroku** (backend)
2. **Wait for Heroku deploy** complete
3. **Run Vercel gate** (frontend deploy)
4. **Production smoke test** (health check)

---

## Backend Deployment (Heroku)

### Configuration
- **Runtime:** Node.js 22
- **Procfile:**
  ```
  web: cd backend && node src/server.js
  release: cd backend && npm run migrate:postgres
  ```
- **Environment:** Production PostgreSQL required

### Release Phase
- Runs `npm run migrate:postgres` before new code deploys
- Ensures schema is up-to-date

### Health Checks
- `GET /health` — Liveness probe
- `GET /health/live` — Liveness
- `GET /health/ready` — Readiness (checks DB)

---

## Frontend Deployment (Vercel)

### Configuration
- **Build:** `npm run build` (Vite)
- **Output:** `dist/`
- **SPA Rewrite:** All routes → `index.html`

### Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (production API URL)

---

## Docker (Code Runner Only)

### Files
- `backend/docker/code-runner/Dockerfile`
- `backend/docker/code-runner/docker-compose.yml`
- `backend/docker/code-runner/runner.js`
- `backend/docker/code-runner/package.json`

### Build
```bash
cd backend/docker/code-runner
docker-compose build
docker-compose up
```

### Security
- Read-only filesystem
- Non-root user
- Resource limits (256MB RAM, 64 PIDs)
- Isolated network

---

## Database Migrations

### Location
`backend/src/db/migrations/` (25 SQL files)

### Execution
- **Heroku:** Automatic via `release` phase
- **Manual:** `npm run migrate:postgres`
- **SQLite:** Automatic on startup (schema creation)

### Migration Files
| # | Purpose |
|---|---------|
| 001 | Initial PostgreSQL schema |
| 002 | DSA AI observability |
| 003 | Daily Challenge v2 |
| 004 | User profile compatibility |
| 005-008 | Missing columns |
| 009 | Schema reconciliation |
| 010 | Practice schema |
| 011-016 | Practice/production alignment |
| 017 | DC system user |
| 018-019 | QB automation |
| 020 | Question bank parity |
| 021 | DC status |
| 022 | Canonical cleanup |
| 023 | Question embeddings |

---

## Scripts

### Seed Admin
```bash
npm run seed:admin
```

### Database Inspection
```bash
node scripts/db_inspect.js
node scripts/list-tables.js
node scripts/verify-tables.js
```

### Migration Validation
```bash
node scripts/verify_migration.js
node scripts/phase5_validation.js
```

---

## Environment Setup

### Development
1. Clone repository
2. `cd backend && npm install`
3. `cd frontend && npm install`
4. Copy `.env.example` → `.env` in both directories
5. `npm run dev` (starts both backend + frontend)

### Production
1. Set all environment variables in Heroku
2. Ensure PostgreSQL is configured
3. Deploy via GitHub Actions
4. Run `npm run seed:admin` if first deploy

---

## Monitoring

### Health Endpoints
- `/health` — Returns status + timestamp
- `/health/live` — Liveness probe
- `/health/ready` — Readiness probe (DB check)

### Logs
- Heroku logs: `heroku logs --tail`
- Morgan HTTP logging in backend
- Console logs for automation/scheduler

---

## Known Deployment Issues

### 1. SQLite in Production Risk
- **Issue:** `runtimeDatabase.js` only warns (doesn't prevent) SQLite in production
- **Impact:** Data loss on Heroku deploy (ephemeral filesystem)
- **Mitigation:** Ensure `DATABASE_URL` is set

### 2. No Zero-Downtime Deploy
- **Issue:** Heroku restarts process on deploy
- **Impact:** Brief downtime during deploys
- **Mitigation:** Use Heroku's preboot (paid tier)

### 3. No Database Backup Automation
- **Issue:** No automated backup configuration
- **Impact:** Manual recovery needed for data loss
- **Mitigation:** Use Heroku Postgres add-on with daily backups
