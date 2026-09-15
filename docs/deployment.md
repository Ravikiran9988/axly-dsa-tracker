# Axly DSA Tracker — Deployment Guide

## Overview

The application has three deployable components:
1. **Backend** (Node.js) → Heroku
2. **Frontend** (Vite/React) → Vercel
3. **Code Runner** (Docker) → Self-hosted

---

## Backend (Heroku)

### Prerequisites
- Heroku account + CLI
- Heroku Postgres add-on

### Deploy
```bash
# Login
heroku login

# Create app
heroku create axly-dsa-tracker

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Add PostgreSQL
heroku addons:create heroku-essential-0

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key
heroku config:set GROQ_API_KEY_1=your-key
heroku config:set GEMINI_API_KEY_1=your-key
heroku config:set CODE_RUNNER_TOKEN=your-token
heroku config:set CODE_EXECUTION_SERVICE_URL=http://your-runner-url:8080
heroku config:set ADMIN_EMAIL=admin@axly.in
heroku config:set CLIENT_ORIGIN=https://dsatracker.axly.in

# Deploy
git push heroku main
```

### Environment Variables
See `docs/environment.md` for full list.

### Release Phase
- Runs `npm run migrate:postgres` before new code deploys
- Ensures schema is up-to-date

### Procfile
```
web: cd backend && node src/server.js
release: cd backend && npm run migrate:postgres
```

---

## Frontend (Vercel)

### Prerequisites
- Vercel account + CLI
- Connected to GitHub repo

### Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL

# Deploy
vercel --prod
```

### Configuration
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **SPA Rewrite:** All routes → `index.html`

### Environment Variables
| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_API_URL` | `https://axly-dsa-tracker.herokuapp.com/api/v1` |

---

## Code Runner (Docker)

### Prerequisites
- Docker + Docker Compose
- Server with Docker installed

### Deploy
```bash
# Clone repo
git clone <repo-url>
cd backend/docker/code-runner

# Create .env file
echo "CODE_RUNNER_TOKEN=your-secure-token" > .env

# Build and run
docker-compose up -d

# Verify
curl http://localhost:8080/health
```

### Docker Compose
```yaml
services:
  code-runner:
    build: .
    ports:
      - "8080:8080"
    environment:
      - CODE_RUNNER_TOKEN=${CODE_RUNNER_TOKEN}
      - NODE_ENV=production
    mem_limit: 256m
    cpus: 1.0
    pids_limit: 64
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    networks:
      - runner_internal
```

### Security
- Read-only filesystem
- Non-root user
- Resource limits
- Isolated network
- Bearer token auth

### Health Check
```bash
curl http://localhost:8080/health
# Returns: {"status":"healthy","timestamp":"..."}
```

---

## GitHub Actions (CI/CD)

### CI Workflow
**Trigger:** Push to `main`/`develop`, Pull Requests

**Steps:**
1. Checkout
2. Setup Node.js 22
3. Install + test backend
4. Install + build frontend
5. Run Playwright E2E (if relevant files changed)

### CD Workflow
**Trigger:** Push to `main`

**Steps:**
1. Deploy to Heroku
2. Wait for deploy
3. Run Vercel gate
4. Production smoke test

### Required Secrets
| Secret | Purpose |
|--------|---------|
| `HEROKU_API_KEY` | Heroku auth |
| `HEROKU_APP_NAME` | Heroku app |
| `PRODUCTION_BASE_URL` | Production URL |
| `VERCEL_TOKEN` | Vercel auth |
| `VERCEL_ORG_ID` | Vercel org |
| `VERCEL_PROJECT_ID` | Vercel project |

---

## Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

### Both Together
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Without Docker Code Runner
- Backend falls back to local process execution
- Set `CODE_EXECUTION_SERVICE_URL` to empty or local URL
- Supports all 6 languages via local binaries

---

## Database Migrations

### Run Migrations
```bash
cd backend
npm run migrate:postgres
```

### Migration Files
Located in `backend/src/db/migrations/` (25 files)

### Automatic
- Heroku release phase runs migrations on deploy
- SQLite: Automatic schema creation on startup

---

## Seed Admin User

### First Deploy
```bash
# Set ADMIN_EMAIL in Heroku
heroku config:set ADMIN_EMAIL=admin@axly.in

# Seed admin
heroku run npm run seed:admin
```

### Manual
```bash
cd backend
ADMIN_BOOTSTRAP_ENABLED=true npm run seed:admin
```

---

## SSL/TLS

### Heroku
- Automatic via Heroku SSL
- Custom domain: `heroku certs:auto:enable`

### Vercel
- Automatic via Vercel
- Custom domain: Add in Vercel dashboard

### Code Runner
- Use reverse proxy (nginx, Caddy)
- Terminate SSL at proxy

---

## Monitoring

### Health Checks
| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness |
| `GET /health/live` | Liveness probe |
| `GET /health/ready` | Readiness (DB check) |

### Logs
```bash
# Heroku
heroku logs --tail

# Docker
docker logs -f code-runner

# Vercel
vercel logs
```

---

## Rollback

### Heroku
```bash
# List releases
heroku releases

# Rollback to previous
heroku rollback

# Rollback to specific release
heroku rollback v123
```

### Vercel
- Go to Deployments dashboard
- Click "Promote to Production" on previous deployment

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `DATABASE_URL` not set | Add Heroku Postgres add-on |
| Runner timeout | Increase `CODE_EXECUTION_SERVICE_URL` timeout |
| CORS error | Check `CLIENT_ORIGIN` env var |
| JWT error | Verify `JWT_SECRET` is set |
| Migration failure | Check database connectivity |

### Debug Mode
```bash
# Backend
LOG_LEVEL=debug npm run dev

# Frontend
VITE_DEBUG=true npm run dev
```

---

## Production Checklist

- [ ] `JWT_SECRET` set (strong, unique)
- [ ] `ADMIN_EMAIL` set
- [ ] `DATABASE_URL` connected
- [ ] Code Runner deployed + health check passing
- [ ] `CODE_RUNNER_TOKEN` set (strong, unique)
- [ ] `CLIENT_ORIGIN` set to production URL
- [ ] LLM API keys configured
- [ ] Email service configured
- [ ] SSL/TLS enabled
- [ ] Monitoring configured
- [ ] Backups scheduled
