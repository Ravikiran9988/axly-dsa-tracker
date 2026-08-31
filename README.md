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

## 📚 Overview

Axly DSA Tracker is a scalable DSA learning platform designed around **structured, pattern-first problem solving**. It combines a curated Practice workspace with competitive Daily Challenges, progress tracking, submissions, mentor workflows, and an AI-powered DSA Coach.

The application is designed for production deployment with a decoupled React frontend, Node.js/Express API, PostgreSQL persistence, isolated code execution, authentication, RBAC, analytics, and automated testing.

### 🚀 Key Capabilities

- **Secure Code Runner:** Execute user code across JavaScript, Python, TypeScript, Java, C, and C++ using isolated Docker environments with execution and resource limits.
- **Practice Mode:** Curated DSA problems with topic, pattern, difficulty, search, status filters, progress tracking, attempts, and solved-state persistence.
- **Daily Challenges:** Dedicated challenge pool with scheduling, test cases, streaks, points, leaderboards, and challenge automation support.
- **Deterministic Scoring:** Submission scoring combines test performance, solve time, and attempt count for competitive assignments.
- **AI DSA Coach:** AI-assisted guidance and question generation with deterministic validation to reduce duplicate or unsuitable generated problems.
- **Role-Based Access Control:** Admin, mentor, and user roles with audit logging, question management, cohorts, assignments, and submission review workflows.
- **Production PostgreSQL:** Supabase PostgreSQL is supported for production while SQLite remains available for lightweight local development and testing.
- **Schema Reconciliation:** PostgreSQL migrations continuously reconcile the production schema with the application repository layer, including compatibility fixes for numeric execution durations.

---

## 🖥️ UI Preview

<div align="center">

### Learner Dashboard
<img src="docs/screenshots/dashboard.png" width="800" alt="Dashboard" />

### Problem Workspace & Code Editor
<img src="docs/screenshots/code-editor.png" width="800" alt="Code Editor" />

### Question Bank & Filters
<img src="docs/screenshots/question-bank.png" width="800" alt="Question Bank" />

</div>

---

## 🏗️ Architecture & Tech Stack

### Backend

- **Runtime:** Node.js 18+
- **Framework:** Express
- **Database abstraction:** Repository pattern
- **Local database:** SQLite via `better-sqlite3`
- **Production database:** PostgreSQL / Supabase
- **Code execution:** Docker-based isolated subprocesses
- **AI:** Groq API and embedding/similarity validation
- **Authentication:** JWT-based authentication with email verification/OTP flows
- **Email:** Nodemailer / SMTP

### Frontend

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Animation:** Framer Motion
- **Routing:** React Router DOM v6
- **Code editor:** Monaco Editor
- **API:** Centralized frontend API service layer

### Engineering Practices

- Repository/service/controller separation
- PostgreSQL migration-based schema management
- Input validation and centralized error handling
- Secure CORS configuration
- Automated Playwright E2E coverage
- Production deployment support for Vercel + Heroku/Render-style API hosting

---

## 🗄️ Architecture & Database Status

Axly supports two database implementations through the repository layer:

```text
                 ┌──────────────────────┐
                 │     React / Vite     │
                 │      Frontend        │
                 └──────────┬───────────┘
                            │ REST / JSON
                            ▼
                 ┌──────────────────────┐
                 │   Express API        │
                 │ Controllers/Services │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │   Repository Layer   │
                 └───────┬───────┬──────┘
                         │       │
                    SQLite       PostgreSQL
                    Local/Test   Production
                         │       │
                         └───┬───┘
                             ▼
                    Business Services
              ┌──────────┬──────────┬─────────┐
              │ Practice │ Scoring  │   AI    │
              │ Daily    │ Progress │ Coach   │
              └──────────┴──────────┴─────────┘
```

Production PostgreSQL is maintained through versioned migrations. The migration chain includes schema reconciliation for practice progress, assignments, submissions, question versioning, audit data, and code execution metadata.

### Recent production compatibility fix

Code execution duration can contain fractional millisecond/second values. The PostgreSQL schema now stores execution-duration fields using floating-point numeric types rather than integer-only types. This prevents errors such as:

```text
invalid input syntax for type integer: "1896.153"
```

The compatibility migration is:

```text
backend/src/db/migrations/016_duration_numeric_compatibility.sql
```

The backend scoring layer also normalizes duration values before persistence.

---

## 🧩 Practice Mode

Practice problems are explicitly marked with `is_practice = TRUE` and maintain user-specific progress independently from competitive scoring.

Supported practice states:

```text
not_started
in_progress
solved
abandoned
```

Practice supports:

- Difficulty filtering: Easy / Medium / Hard
- Topic filtering
- Pattern filtering
- Text search
- Solved / In-progress / Unsolved filtering
- Pagination
- Per-user progress
- Attempts and solve timestamps
- Topic and difficulty progress analytics
- Starter code for multiple languages

Practice submissions do **not** use the competitive scoring calculation; scoring is reserved for applicable competitive/assigned submissions.

---

## ⚡ Secure Code Runner

The Problem Workspace provides an online coding environment with:

- JavaScript / Node.js
- Python 3.11
- TypeScript
- Java
- C++
- C

Users can run code against sample/custom input or submit a solution against configured test cases.

### Execution safeguards

1. **Isolation:** User code executes inside an ephemeral Docker environment.
2. **Resource limits:** CPU and execution time are restricted.
3. **Network denial:** Sandbox execution does not require outbound network access.
4. **Result reporting:** Each test reports pass/fail status, output, errors, and execution timing.
5. **Submission tracking:** Attempts and execution metadata are persisted for applicable submissions.

The frontend workspace supports both **Run** and **Submit** flows and displays statuses such as:

```text
Accepted
Wrong Answer
Time Limit Exceeded
Runtime Error
Compilation Error
```

---

## 🏆 Competitive Scoring

Competitive submissions use a deterministic score made from three components:

| Component | Weight |
|---|---:|
| Test performance | 60 |
| Time performance | 20 |
| Attempt efficiency | 20 |
| **Maximum** | **100** |

The scoring service calculates and persists:

- `test_score`
- `time_score`
- `attempt_score`
- `final_score`
- `solve_duration_seconds`
- `attempt_count`

Practice-mode questions are excluded from competitive scoring.

---

## 🤖 AI DSA Coach

The platform includes an AI DSA Coach for learning assistance and problem-generation workflows.

The AI layer is designed around deterministic safeguards rather than blindly trusting model output. Generated content can be validated against application rules and similarity checks before being used by the platform.

AI-related capabilities include:

- DSA coaching
- Hints and guidance
- Recommendation workflows
- AI-assisted Daily Challenge generation
- Duplicate/similarity validation
- Structured problem metadata generation

---

## 🔐 Authentication & RBAC

Axly supports three application roles:

- `user`
- `mentor`
- `admin`

Authentication includes JWT-based sessions and email verification/OTP support.

Administrative capabilities include:

- User and role management
- Question curation
- Cohorts and assignments
- Submission review
- Audit logs
- Challenge management
- Notifications

---

## 🔌 Core API Topology

Routes are registered under the `/api/v1` namespace:

- **Identity & Profiles:** `/auth`, `/users`
- **Curriculum:** `/questions`, `/practice`, `/assignments`
- **Competitive:** `/daily-challenges`, `/leaderboard`
- **Execution:** `/submissions`, `/code`
- **Analytics:** `/progress`, `/analytics`
- **AI:** `/recommendations`, `/dsa-ai`, `/ai-questions`
- **Admin & Telemetry:** `/admin/audit-logs`, `/notifications`, `/cohorts`

---

## 🛠️ Prerequisites

1. **Node.js:** v18+
2. **Docker Desktop:** Required for local Secure Code Runner execution.
3. **PostgreSQL:** Required when running the application against the production PostgreSQL configuration.
4. **Git:** Required to clone and manage the repository.

---

## 🚀 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Ravikiran9988/axly-dsa-tracker.git
cd axly-dsa-tracker
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Configure backend environment

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173

# PostgreSQL / Supabase when required
DATABASE_URL=postgresql://user:password@host:port/db

# AI
GROQ_API_KEY_1=your_groq_api_key

# Email verification / OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

Do not commit real credentials to GitHub.

### 4. Start the backend

```bash
cd backend
npm run db:setup
npm run dev
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🗃️ Database Migrations

PostgreSQL schema changes are maintained as versioned migrations under:

```text
backend/src/db/migrations/
```

Recent reconciliation migrations address differences between the legacy SQLite schema and PostgreSQL production schema, including:

- Assignments and practice fields
- Practice progress state normalization
- Submission scoring fields
- Audit-log fields
- Question versioning
- Code-submission metadata
- Fractional execution-duration compatibility

When deploying a new migration, ensure the production database runs the complete migration sequence in order.

---

## 🧪 Testing

Axly maintains automated tests for backend behavior and end-to-end user journeys.

### Playwright E2E

```bash
npx playwright test tests/e2e/axly_v1_complete.spec.js
```

For trace debugging:

```bash
npx playwright show-trace test-results/<failed-test-dir>/trace.zip
```

Test coverage includes important flows such as authentication, OTP registration, practice workflows, code execution, submissions, and user-facing application journeys.

---

## 👨‍💼 Admin Experience

Administrators have access to moderation and configuration tools protected by role-based authorization.

<div align="center">
<img src="docs/screenshots/admin-dashboard.png" width="800" alt="Admin Dashboard" />
<img src="docs/screenshots/admin-questions.png" width="800" alt="Admin Questions" />
</div>

---

## 📁 Important Backend Structure

```text
backend/
├── src/
│   ├── controllers/       # HTTP request handlers
│   ├── services/          # Business logic
│   ├── db/                # Repository, schema and migrations
│   ├── middleware/        # Auth, validation and error handling
│   └── app.js             # Express application
├── scripts/               # Database/data utilities
└── tests/                 # Backend tests

frontend/
├── src/
│   ├── components/        # Reusable UI components
   ├── pages/             # Application screens
   ├── services/           # API clients
   └── App.jsx             # Application entry
```

---

## 📌 Production Notes

- Keep production secrets in the hosting platform's environment configuration.
- Run database migrations before depending on newly introduced schema fields.
- Use PostgreSQL/Supabase for persistent production data rather than the local SQLite database.
- Keep Docker available for local code-runner development.
- Do not expose internal execution infrastructure directly to untrusted clients.
- Validate both frontend and backend behavior after every schema or execution-engine change.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
<i>Built for developers who want to master algorithms through dedicated practice.</i>
</div>
