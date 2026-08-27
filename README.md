# Axly DSA Tracker

> A production-style Data Structures & Algorithms practice platform for structured learning, assignment tracking, coding submissions, GitHub submissions, progress analytics, and admin-managed learner workflows.

**Production:** `dsatracker.axly.in`

---

## ✨ Overview

Axly DSA Tracker is designed to give learners a structured environment to practice DSA problems and give administrators a central place to manage the question bank, assignments, daily challenges, and learner progress.

The platform supports two submission paths:

- **Code Editor** — write, run, and submit solutions directly in the platform.
- **GitHub Submission** — submit a repository/file reference with an immutable commit SHA for review.

Users authenticate through **Google OAuth with Supabase Auth**. New accounts receive the normal user role; administrator access is granted through the secure one-time admin seed process described below.

---

## 🚀 Core Features

### 👨‍💻 Learner Experience

- Google OAuth authentication
- Personalized user dashboard
- Assigned question bank
- Daily DSA challenge
- Difficulty filtering: Easy, Medium, Hard
- Topic filtering and search
- Assignment status tracking
- Solution statuses:
  - `not_started`
  - `attempted`
  - `solved`
  - `skipped`
- Progress and completion analytics
- Points and streak tracking
- Coding workspace with code editor
- Run solutions against test cases
- Code submission history
- GitHub-based solution submission
- Submission/review tracking
- Responsive mobile-friendly interface

### 🛠️ Admin Experience

- Admin-only dashboard
- Question repository management
- Create, edit, and soft-delete questions
- Topic management
- Single-user assignment
- Bulk assignment
- Assignment history/audit information
- Daily question scheduling
- Learner progress audit
- Points/streak management
- Role-based access control

### ⚡ Code Execution

The coding workspace supports:

- JavaScript
- TypeScript
- Python
- Java
- C
- C++

Execution is isolated in a Docker-based runner with resource and security restrictions, compilation/execution timeouts, output limits, hidden-test protection, and temporary workspace cleanup.

---

## 🏗️ Architecture

```text
                         AXLY DSA TRACKER
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
             Frontend                       Backend API
          React + Vite +                   Node.js + Express
           Tailwind CSS                     /api/v1
                 │                             │
        ┌────────┼────────┐          ┌─────────┼─────────┐
        │        │        │          │         │         │
      Auth     Practice  Admin     Auth/RBAC Questions Progress
        │        │        │          │         │         │
        └────────┼────────┘          └─────────┼─────────┘
                 │                             │
                 │                    ┌────────┴────────┐
                 │                    │                 │
                 │              Submissions        Assignments
                 │                    │
                 │             ┌──────┴──────┐
                 │             │             │
                 │         Code Runner    GitHub
                 │          Docker        Commit SHA
                 │
                 └───────────────┬─────────────────────
                                 │
                         Supabase PostgreSQL
                              + RLS
```

### Authentication flow

```text
Google
  ↓
Supabase Auth
  ↓
Access Token
  ↓
Backend Token Verification
  ↓
Database User / Role Lookup
  ↓
USER or ADMIN authorization
```

### Code submission flow

```text
Student writes solution
        ↓
POST /api/v1/code/execute
        ↓
Backend validation
        ↓
Secure Docker Runner
        ↓
Compile (if required)
        ↓
Execute test cases
        ↓
Timeout / output / resource checks
        ↓
Return result
        ↓
Student sees result
        ↓
Submit solution
        ↓
Submission history + progress
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Lucide React |
| Backend | Node.js, Express.js |
| API | REST API under `/api/v1` |
| Authentication | Supabase Auth + Google OAuth |
| Database | PostgreSQL / Supabase |
| Security | RLS, RBAC, Helmet, CORS, rate limiting, validation |
| Validation | Zod |
| Code Execution | Docker sandbox |
| Testing | Jest, Supertest, Playwright |
| Version Control | Git + GitHub |

---

## 📁 Project Structure

```text
axly-dsa-tracker/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validation/
│   │   ├── db/
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   │   └── seed-admin.js
│   ├── docker/
│   │   └── code-runner/
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── tests/
│   └── package.json
│
├── database/
│   ├── migrations/
│   └── policies/
│
├── docs/
│   └── api-reference.md
│
├── tests/
│   └── e2e/
│
└── README.md
```

---

## 🔐 Authentication & Roles

Axly uses Google OAuth through Supabase Auth.

There are two application roles:

- `user` — learner/practice access
- `admin` — management and administrative access

The frontend does not act as the security boundary. The backend verifies the authenticated session and resolves authorization server-side.

### First Admin Setup

The production UI intentionally has **no demo login buttons or hard-coded demo accounts**.

1. Sign in once with the intended admin Google account.
2. Make sure the corresponding `users` profile exists.
3. Temporarily enable the bootstrap flag in the backend environment:

```env
ADMIN_BOOTSTRAP_ENABLED=true
ADMIN_EMAIL=admin@example.com
```

4. Run:

```bash
cd backend
npm install
npm run seed:admin -- --email=admin@example.com
```

5. Immediately disable/remove `ADMIN_BOOTSTRAP_ENABLED` from the production environment.
6. Sign in again through Google.

The seed script only promotes an **existing authenticated Supabase user**. It does not create authentication credentials.

---

## ⚙️ Environment Variables

Copy the backend example file:

```bash
cp backend/.env.example backend/.env
```

Example:

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
ADMIN_BOOTSTRAP_ENABLED=false
ADMIN_EMAIL=admin@example.com
```

**Never expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend or commit real secrets.**

---

## 💻 Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 🧪 Testing

### Backend tests

```bash
cd backend
npm test
```

### Frontend production build

```bash
cd frontend
npm run build
```

### Playwright E2E

```bash
npx playwright install chromium
npx playwright test
```

Recommended critical journey coverage:

```text
Login
 ↓
Dashboard
 ↓
Assigned Problem
 ↓
Code Editor
 ↓
Run Solution
 ↓
Submit Solution
 ↓
Submission History
 ↓
GitHub Submission
 ↓
Admin Management
```

---

## 🐳 Secure Code Runner

The code runner is designed to execute untrusted student code inside a restricted Docker environment.

Security controls include:

- Read-only container filesystem
- Dropped Linux capabilities
- `no-new-privileges`
- CPU limit
- Memory limit
- PID limit
- Internal Docker network
- Dedicated executable workspace
- Non-executable `/tmp`
- Compilation timeout
- Execution timeout
- Output-size limit
- Input-size limit
- Test-case limit
- Process-group termination
- Temporary workspace cleanup
- Hidden test output protection

### Runner endpoint

The API should communicate with the runner internally using:

```text
http://code-runner:8080
```

The runner should **not be publicly exposed**.

---

## 📊 Progress Calculation

Current completion is based on active questions currently assigned to the learner:

```text
Completion % =
(Solved currently-assigned active questions
 / Currently-assigned active questions) × 100
```

Unassigned questions are excluded from the current denominator while historical submissions remain preserved.

---

## 🗄️ Data Integrity & Security

Important database guarantees include:

- `users.id` corresponds to the authenticated user identity.
- `UNIQUE(user_id, question_id)` prevents duplicate assignments.
- `UNIQUE(user_id, question_id)` prevents duplicate submissions.
- Daily questions enforce one record per date.
- RLS protects database-level data access.
- Admin-only operations are protected by server-side RBAC.
- Questions are soft-deleted rather than destructively removed.
- Today's active daily question cannot be deleted without changing the daily question first.

---

## 🔗 API

The backend API is versioned under:

```text
/api/v1
```

Detailed endpoint documentation is available in:

```text
docs/api-reference.md
```

Major API areas include:

- Authentication
- Users
- Questions
- Daily Questions
- Assignments
- Submissions
- Code Execution
- GitHub Submissions
- Progress
- Points/Streaks
- Cohorts
- Notifications

---

## 🚢 Production Checklist

Before production deployment:

- [ ] Configure Supabase project
- [ ] Apply database migrations
- [ ] Apply RLS policies
- [ ] Configure Google OAuth
- [ ] Configure production environment variables
- [ ] Create the first admin with `seed:admin`
- [ ] Disable admin bootstrap
- [ ] Keep service-role credentials server-side
- [ ] Build frontend successfully
- [ ] Run backend tests
- [ ] Run Playwright tests
- [ ] Build and test the Docker code runner
- [ ] Verify all six supported languages
- [ ] Test compilation errors
- [ ] Test runtime errors
- [ ] Test timeouts
- [ ] Test output limits
- [ ] Test hidden tests
- [ ] Test concurrent submissions
- [ ] Ensure the code runner is not publicly exposed
- [ ] Configure HTTPS and production CORS

---

## 📚 Documentation

- `docs/api-reference.md` — API reference
- `database/migrations/` — database schema
- `database/policies/` — RLS policies
- `backend/docker/code-runner/` — secure execution environment
- `backend/scripts/seed-admin.js` — first-admin bootstrap

---

## 👨‍💻 Project

**Axly DSA Tracker**

Production URL: `dsatracker.axly.in`

Repository: `https://github.com/Ravikiran9988/axly-dsa-tracker`

---

## 📄 License

Add the project's intended license here before public distribution.
