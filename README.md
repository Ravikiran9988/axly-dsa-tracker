# Axly DSA Tracker

Production-quality Data Structures and Algorithms tracking platform built according to the Axly DSA Tracker PRD & Technical Documentation.

**Production URL**: `dsatracker.axly.in`  
**Version**: 1.0.0

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express.js (Versioned REST API under `/api/v1`)
- **Authentication**: Supabase Auth (Google OAuth) + Session verification
- **Database**: PostgreSQL / Supabase with Row Level Security (RLS)
- **Testing**: Supertest (Backend API Acceptance Tests) & Playwright (E2E)

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ & npm

### 2. Running Locally

```bash
# Install backend and frontend dependencies
cd backend && npm install
cd ../frontend && npm install

# Start Backend (runs on http://localhost:5000)
npm run dev:backend

# In a separate terminal, start Frontend (runs on http://localhost:5173)
npm run dev:frontend
```

### 3. Running Automated Acceptance Tests

```bash
# Run Backend API & Acceptance Criteria test suite
npm run test:backend

# Run Playwright E2E test suite
npm run test:e2e
```

---

## 📁 Repository Structure

```
Axly Dsa Tracker/
├── backend/
│   ├── src/
│   │   ├── controllers/       # REST API controllers
│   │   ├── routes/            # /api/v1 route definitions
│   │   ├── services/          # Progress calculations, assignments & daily question logic
│   │   ├── middleware/        # Auth verification, RBAC, rate limiting, error handler
│   │   ├── validation/        # Zod validation schemas
│   │   ├── db/                # Database engine & seed script
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # Server entrypoint
│   └── tests/
│       └── api.test.js        # 19 Acceptance Criteria test suites
├── frontend/
│   ├── src/
│   │   ├── components/        # DailyQuestionCard, ProgressOverview, QuestionCard, Modals, Navbar
│   │   ├── pages/             # Login, UserDashboard, AdminDashboard
│   │   ├── services/          # Axios/Fetch API client wrappers
│   │   ├── context/           # AuthContext (Google OAuth & role resolution)
│   │   ├── App.jsx
│   │   └── index.css          # Axly brand design system
│   └── index.html
├── database/
│   ├── migrations/            # 001_initial_schema.sql
│   └── policies/              # rls_policies.sql
├── docs/
│   └── api-reference.md       # Full API documentation
├── tests/
│   └── e2e/                   # Playwright E2E specs
└── playwright.config.js
```

---

## 🛡️ Security & Architecture Guarantees

1. **Authentication Ownership**: Google OAuth flow is managed end-to-end with Supabase Auth. Google client secrets never touch the frontend.
2. **Server-Side RBAC**: User roles are re-derived on every request server-side. Frontend role state is never trusted as a security boundary.
3. **Database-Level Uniqueness**: `UNIQUE(user_id, question_id)` is enforced at the database level on `assignments` and `submissions` to guarantee correctness under concurrent requests.
4. **Daily Question Invariant**: Admin cannot soft-delete an active question while it is today's UTC daily question (returns `409 Conflict`).
5. **Completion Formula**:
   $$\text{Completion \%} = \frac{\text{Solved currently-assigned active questions}}{\text{Currently-assigned active questions}} \times 100$$
   Unassigned questions are excluded from the current denominator while preserving historical submissions.
