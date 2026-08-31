<div align="center">

# Axly DSA Tracker

**A production-ready DSA learning platform combining structured practice, competitive Daily Challenges, and deterministic-first AI coaching.**

[![Tests](https://img.shields.io/badge/tests-306%20passed-brightgreen?style=flat-square)](#-testing)
[![Languages](https://img.shields.io/badge/languages-JS%20%7C%20Python%20%7C%20TS%20%7C%20Java%20%7C%20C%20%7C%20C++-blue?style=flat-square)](#-secure-code-runner)
[![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20PostgreSQL-informational?style=flat-square)](#-architecture--database-status)

**Production:** `https://dsatracker.axly.in`  
**Repository:** `https://github.com/Ravikiran9988/axly-dsa-tracker`  
**License:** [MIT](LICENSE)

</div>

---

## ?? Overview

Axly DSA Tracker is a highly-scalable, production-level platform designed to help developers master Data Structures and Algorithms through curated, pattern-first problem solving. Unlike generic competitive programming platforms, Axly focuses on the **educational progression** of developers, offering both a standalone practice mode and competitive daily challenges.

### ?? Key Capabilities
* **Secure Sandbox Execution Engine:** Supports real-time code evaluation across JavaScript, Python, TypeScript, Java, C, and C++ using isolated Docker environments with strict CPU (2000ms) and memory limits.
* **Dual-Driver Architecture:** Dynamically switches between an ephemeral SQLite driver for zero-config local testing and a robust PostgreSQL (Supabase) driver for production clustering.
* **Intelligent AI Coach:** Leverages the Groq API (multi-key rotated for rate-limit protection) with strict deterministic cosine-similarity checks (>0.85 threshold) to prevent duplicate AI-generated problems and provide phase-based coaching.
* **Role-Based Access Control (RBAC):** Complete administrative dashboard to manage user roles, audit trails, question curation, cohort assignments, and submission reviews.
* **UTC-Synchronized Competitive Play:** Daily Challenges operate on strict UTC midnight rollovers, recalculating global streaks and Elo-style leaderboards immutably on the backend.

---

## ?? UI Preview

<div align="center">

### Learner Dashboard
<img src="docs/screenshots/dashboard.png" width="800" alt="Dashboard" />

### Problem Workspace & Code Editor
<img src="docs/screenshots/code-editor.png" width="800" alt="Code Editor" />

### Question Bank & Filters
<img src="docs/screenshots/question-bank.png" width="800" alt="Question Bank" />

</div>

---

## ?? Architecture & Tech Stack

The architecture is explicitly decoupled, allowing for horizontal scalability and independent deployment of microservices.

### Backend (Node.js & Express)
* **Core API**: Express RESTful architecture.
* **Storage**: Repository pattern with `SqliteRepository` (local dev) and `PostgresRepository` (Supabase production).
* **Execution**: Docker Engine via isolated subprocesses for untrusted code execution.
* **AI & Search**: Groq LLM API with custom embedding pipelines.
* **Auth**: Custom stateless JWT implementation over secure, HttpOnly channels (with fallback Dev-Bypass for local e2e testing).
* **Mailer**: Nodemailer over SMTP with 5000ms Heroku H12 socket timeouts.

### Frontend (React & Vite)
* **Framework**: React 18 with Vite for HMR and optimized builds.
* **Styling**: Tailwind CSS + Lucide Icons + Framer Motion.
* **Routing**: React Router DOM (v6) with dynamic SPA configurations (`vercel.json` supported).
* **State Management**: Context API and highly-optimized local React state.
* **Code Editor**: Monaco Editor (VS Code core) integrated via `@monaco-editor/react`.

---

## ?? Prerequisites

1. **Node.js**: v18+ 
2. **Docker Desktop**: Required to run the Secure Code Runner locally.
3. **PostgreSQL**: A cloud Postgres instance (like Supabase) is required if `NODE_ENV=production`.

---

## ?? Local Development Guide

### 1. Repository Setup
```bash
git clone https://github.com/Ravikiran9988/axly-dsa-tracker.git
cd axly-dsa-tracker

# Install dependencies for both environments
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173

# Required for Production (Postgres)
DATABASE_URL=postgresql://user:password@host:port/db

# Required for AI Features
GROQ_API_KEY_1=your_groq_api_key

# Required for Email Verification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Launch Services
Open two terminal instances.

**Terminal 1 (Backend):**
```bash
cd backend
npm run db:setup # Initializes SQLite schema for dev
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## ?? Core API Topology

Routes are registered in `backend/src/app.js` under the `/api/v1` namespace:

- **Identity & Profiles**: `/auth`, `/users`
- **Curriculum**: `/questions`, `/practice`, `/assignments`
- **Competitive**: `/daily-challenges`, `/leaderboard`
- **Execution**: `/submissions`, `/code`
- **Analytics & Progression**: `/progress`, `/analytics`
- **AI Infrastructure**: `/recommendations`, `/dsa-ai`, `/ai-questions`
- **Admin & Telemetry**: `/admin/audit-logs`, `/notifications`, `/cohorts`

---

## ?? Security & Sandboxing

Security is a primary concern for the platform, particularly regarding the Code Runner:

1. **Isolation**: Every user submission is executed inside a stateless, ephemeral Docker container (`docker run --rm`).
2. **Resource Limits**: CPU cycles are heavily restricted. If an execution exceeds 2000ms (e.g. an infinite `while(true)` loop), the container is forcefully killed via SIGKILL.
3. **Network Denial**: Network interfaces are stripped from the sandbox; code cannot perform outbound requests (`fetch`, `curl`, etc.).
4. **CORS Validation**: Fail-closed strict Origin validation allows only explicit domains.

---

## ?? Testing & CI/CD

Axly DSA Tracker maintains a robust E2E test suite using **Playwright**. Tests validate full user journeys including OTP registration, email timeouts, stateless auth token extraction, and code submission mechanics.

```bash
# Run local E2E test suite
npx playwright test tests/e2e/axly_v1_complete.spec.js

# View test trace for debugging
npx playwright show-trace test-results/<failed-test-dir>/trace.zip
```

---

## ?? Admin Experience

Administrators have access to a full suite of moderation and configuration tools, hidden behind strict JWT Role RBAC.

<div align="center">
<img src="docs/screenshots/admin-dashboard.png" width="800" alt="Admin Dashboard" />
<img src="docs/screenshots/admin-questions.png" width="800" alt="Admin Questions" />
</div>

---

<div align="center">
<i>Built for developers who want to master algorithms through dedicated practice.</i>
</div>
