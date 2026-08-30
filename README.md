<div align="center">

# Axly DSA Tracker

**Production-oriented DSA learning platform combining structured practice, competitive Daily Challenges, and deterministic-first AI coaching.**

[![Tests](https://img.shields.io/badge/tests-306%20passed-brightgreen?style=flat-square)](#-testing)
[![Languages](https://img.shields.io/badge/languages-JS%20%7C%20Python%20%7C%20TS%20%7C%20Java%20%7C%20C%20%7C%20C++-blue?style=flat-square)](#-secure-code-runner)
[![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20PostgreSQL-informational?style=flat-square)](#-architecture--database-status)

**Production:** `https://dsatracker.axly.in`  
**Repository:** `https://github.com/Ravikiran9988/axly-dsa-tracker`  
**License:** [MIT](LICENSE)

</div>

---

## 📸 UI Preview

<div align="center">

### Learner Dashboard
<img src="docs/screenshots/dashboard.png" width="800" alt="Dashboard" />

### Problem Workspace & Code Editor
<img src="docs/screenshots/code-editor.png" width="800" alt="Code Editor" />

### Question Bank & Filters
<img src="docs/screenshots/question-bank.png" width="800" alt="Question Bank" />

</div>

---

## 🚀 Prerequisites

Before starting, ensure you have the following installed:
1. **Node.js**: v18 or higher (required for the backend and modern React/Vite frontend).
2. **Docker**: Required for the Secure Code Runner (to execute user submissions in isolated sandboxes).
3. **Supabase Project**: A Postgres database is required before filling in production environment variables.

---

## ⚙️ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Ravikiran9988/axly-dsa-tracker.git
cd axly-dsa-tracker

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables
Create a `.env` file in `backend/`:
```env
PORT=5000
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173

# Database Connection (Supabase/Postgres)
DATABASE_URL=your_supabase_postgres_url

# Groq Multi-Key Setup for AI
GROQ_API_KEY_1=your_first_groq_key
GROQ_API_KEY_2=your_second_groq_key
```

### 3. Setup & Run
```bash
cd backend
npm run db:setup
npm run dev

# Open new terminal
cd frontend
npm run dev
```

---

## 🏗️ Architecture & Database Status

The application uses a dual-driver database strategy to support both local development and scalable production:
- **`repositoryFactory.js`**: Dynamically selects `SqliteRepository` (for lightweight local dev) or `PostgresRepository` (for production via Supabase) based on an env-driven `getDatabaseDriver()` call.
- **Migration**: The `backend/scripts/migrate-postgres.js` script runs `initPostgresSchema` and `seedPostgresDatabase` for the Postgres pathway.
- **Status**: SQLite remains the dev default, while Postgres/Supabase is the primary production target (migration in progress).

---

## 🔐 Auth Flow

The platform implements a custom JWT-based authentication system:
- **Stateless Sessions**: JWTs are signed securely on the backend and transmitted securely.
- **Role-Based Access Control (RBAC)**: Enforces `admin` vs `user` boundaries.
- **Dev Bypass**: A dedicated `dev-login` endpoint exists exclusively for local testing, completely disabled in production environments.

---

## 💻 Secure Code Runner

User submissions are executed securely:
- Supported languages: **JavaScript, Python, TypeScript, Java, C, C++**.
- Executions run inside isolated Docker sandboxed subprocesses.
- Strict CPU timeouts (e.g., 2000ms) and memory limits prevent malicious code or infinite loops from crashing the server.
- The execution engine securely manages hidden test cases out of user reach.

---

## 📈 Progress Calculation

Progress is strictly tracked on the backend:
- The frontend never decides scoring or streak eligibility.
- Submissions are evaluated against authoritative test suites.
- Only successful `Daily Challenge` submissions within the active UTC window increment competitive points. Practice problem completions increment pure educational progression flags (Solved/In Progress/Not Started).

---

## 📜 Product Rules & Business Logic

Core product rules enforced by the backend:
- **Daily Challenges**: Run strictly on UTC, with a hard midnight-UTC submission cutoff.
- **Streak Logic**: Maintained incrementally. Submissions must occur within consecutive 24-hour UTC windows. Missing a window resets the active streak.
- **Leaderboards**: Ordered strictly by total competitive points, prioritizing earlier submissions as a tie-breaker.
- **AI Duplicate Detection**: Problem duplicate detection uses cosine similarity applied to problem descriptions with a strict **0.85 threshold** to prevent repetitive generation.

---

## 📡 Major API Areas

Axly's backend architecture is heavily modularized. Routes registered in `backend/src/app.js`:

- `/api/v1/auth` - Authentication & Session handling
- `/api/v1/users` - User profiles & settings
- `/api/v1/questions` - Core question bank (Practice)
- `/api/v1/practice` - Practice progress and state
- `/api/v1/daily-challenges` - UTC-synced challenges
- `/api/v1/submissions` - Code submission & history
- `/api/v1/code` - Secure execution endpoints
- `/api/v1/progress` - User progress calculation
- `/api/v1/analytics` - System & user-level analytics
- `/api/v1/recommendations` - Knowledge-graph topic suggestions
- `/api/v1/dsa-ai` - 4-phase AI Coach endpoints
- `/api/v1/ai-questions` - AI generation context
- `/api/v1/cohorts` - Grouping & cohort assignments
- `/api/v1/assignments` - Instructor-assigned problems
- `/api/v1/notifications` - Realtime and unread alert system
- `/api/v1/admin/audit-logs` - System-wide audit trails

---

## 👑 Admin Experience

Administrators have access to a full suite of moderation and configuration tools.

<div align="center">

### Admin Dashboard
<img src="docs/screenshots/admin-dashboard.png" width="800" alt="Admin Dashboard" />

### Question Management
<img src="docs/screenshots/admin-questions.png" width="800" alt="Admin Questions" />

</div>
