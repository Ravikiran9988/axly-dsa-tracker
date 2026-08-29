# Axly DSA Tracker

> A production-grade Data Structures & Algorithms practice and learning platform featuring an 80-problem curated Practice Bank, competitive Daily Challenges, an in-platform sandboxed code editor supporting 6 languages, detailed progress analytics, and comprehensive admin content management.

**Production URL:** `https://dsatracker.axly.in`  
**Repository:** `https://github.com/Ravikiran9988/axly-dsa-tracker`

---

## 📌 Overview

**Axly DSA Tracker** provides a structured environment for students to master algorithmic problem-solving and for administrators to manage curriculum, track submissions, and audit learner progress.

The platform provides two primary student tracks:
1. **Self-Paced Practice Library**: 80 curated problems mapped to a strict pattern taxonomy (0 competitive score, pure personal mastery).
2. **Competitive Daily Challenge**: One global daily algorithmic challenge per UTC day (100 points, streak maintenance, and leaderboard ranking).

Students write, execute, and submit code directly in the platform via a sandboxed code editor, or submit repository links for mentor review.

---

## ✨ Core Features

### 🎓 Student Experience
- **Authentication & Profiles**: Secure session management and demo login options for local testing.
- **Student Dashboard**: Quick access to the active Daily Challenge, topic mastery stats, and practice quick-launch.
- **Practice Problem Bank**: 80 hand-crafted problems with multi-dimensional filtering (Search, Topic, Pattern, Difficulty, Status).
- **In-Platform Problem Workspace**:
  - Problem statement, constraints, example test cases, hints, and past submission history.
  - Prominent, fully editable **Code Editor** with dynamic problem-titled standard I/O starter templates.
  - Multi-language support: **JavaScript (Node.js)**, **Python 3**, **TypeScript**, **Java**, **C++**, and **C**.
  - **Run Code**: Evaluates code against public test cases or custom standard input (`stdin`).
  - **Submit Solution**: Evaluates code against all test cases (including hidden edge cases) and records attempts.
  - **GitHub Submissions**: Alternative submission pathway via public repository links.
- **Practice Progress & Analytics**: Visual completion tracking across all 8 core DSA topics and 3 difficulty tiers.
- **Daily Challenge & Streaks**: UTC-synced daily challenges awarding 100 points and maintaining daily solve streaks.
- **Competitive Leaderboard**: Real-time rank ordering based on competitive points and streak consistency.

### 🛡️ Admin Experience
- **Admin Command Center**: Global metrics, submission review volume, active student counts, and question bank stats.
- **Question Bank Management**:
  - Full CRUD operations: Create, Preview, Edit, Publish/Unpublish, and Soft-delete (Archive).
  - Version history and rollback comparison.
- **Language-Agnostic AI Question Generator**:
  - Generates full problem specifications (description, constraints, examples, test cases, and algorithmic solution approach) based on Topic, Difficulty, and desired Test Case count.
  - Enforces language-independent problem design solvable via standard I/O across all supported languages.
- **Daily Challenge Scheduler**: Set, schedule, or override the active problem for any UTC date.
- **Learner Oversight**: Inspect student rosters, individual progress breakdowns, and code submission histories.
- **Submission Reviews**: Grade, review, and leave structured mentor feedback on student code.
- **Security Audit Logs**: Immutable audit log of all administrative actions, question updates, and user state changes.

---

## 🎯 Practice System vs. Daily Challenge

To ensure a balanced learning and competitive experience, Axly enforces a strict separation between Practice and Daily Challenge:

| Feature | Practice Problem Bank | Daily Challenge |
| :--- | :--- | :--- |
| **Objective** | Comprehensive curriculum mastery & pattern recognition | Daily consistency & competitive problem-solving |
| **Curriculum Scope** | 80 curated problems across 8 topics | 1 selected problem per UTC calendar day |
| **Pacing** | Self-paced (`Start`, `Continue`, `Review`, `Abandon`) | 24-hour UTC window per challenge |
| **Competitive Points** | **0 points** (Pure learning invariant) | **+100 points** per first successful solve |
| **Daily Streak** | Does **not** affect Daily Streak | Increments consecutive solve streak |
| **Leaderboard Impact**| Does **not** affect Competitive Leaderboard | Directly updates Global & Periodic Leaderboards |

---

## 📚 80-Problem Dataset & Pattern Taxonomy

Axly V1 ships with exactly **80 hand-curated practice problems** balanced across 8 core topics and 14 controlled algorithmic patterns:

```text
├── Arrays (12)
├── Strings (10)
├── Hashing (8)
├── Two Pointers & Sliding Window (10)
├── Stack (8)
├── Binary Search (8)
├── Trees (12)
└── Dynamic Programming (12)
───────────────────────────────
Total: 80 Problems
```

### Approved Pattern Taxonomy:
- `two-pointers` (Two Pointers)
- `sliding-window` (Sliding Window)
- `fast-slow-pointers` (Fast & Slow Pointers)
- `hash-map-lookup` (Hash Map Lookup)
- `prefix-sum` (Prefix Sum)
- `kadanes-algorithm` (Kadane's Algorithm)
- `monotonic-stack` (Monotonic Stack)
- `binary-search` (Binary Search)
- `binary-search-on-answer` (Binary Search on Answer)
- `tree-bfs` (Tree BFS / Level Order Traversal)
- `tree-dfs` (Tree DFS)
- `tree-recursion` (Tree Recursion)
- `1d-dp` (1D Dynamic Programming)
- `2d-dp` (2D Dynamic Programming)

---

## 💻 Code Execution Architecture

The in-platform coding workspace allows students to write and test solutions without leaving the browser:

```text
Student Editor (Monaco / Textarea)
        │
        ▼
POST /api/v1/code/run  OR  POST /api/v1/code/submit
        │
        ▼
Backend Rate Limiter & Validation (Zod)
        │
        ▼
Sandboxed Execution Service (Local Subprocess / Docker Runner)
        │
  ├── File Generation (solution.js / solution.py / Main.java / solution.cpp)
  ├── Stdin Pipeline (Pipes test case input to process stdin)
  ├── Resource & Timeout Constraints (5,000 ms limit, 64 KB stdout limit)
  └── Normalization & Output Verification
        │
        ▼
JSON Result (Passed / Wrong Answer / Time Limit Exceeded / Runtime Error)
```

### Supported Execution Environments:
- **JavaScript**: Node.js 18+ runtime
- **Python 3**: Python 3.10+ runtime
- **TypeScript**: `ts-node` / compiled execution
- **Java**: OpenJDK 17+
- **C++**: GCC / G++ 11+
- **C**: GCC

---

## 🏗️ Architecture & Database

```text
                              AXLY DSA TRACKER
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
                 Frontend                         Backend API
              React 18 + Vite                  Node.js + Express
              Tailwind CSS                     /api/v1 REST API
                     │                               │
                     │                 ┌─────────────┴─────────────┐
                     │                 ▼                           ▼
                     │        Repository Factory           Code Runner Service
                     │        (Driver Switchable)           (Sandbox / Docker)
                     │                 │
                     └─────────────────┼───────────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │      Database Layer           │
                       ├───────────────────────────────┤
                       │ Local/Test: SQLite (better3)  │
                       │ Production: PostgreSQL / Supa │
                       └───────────────────────────────┘
```

### Database Repository Pattern:
- **`backend/src/db/repositoryFactory.js`**: Automatically binds either `SqliteRepository` (for local development and instant test suite runs) or `PostgresRepository` (for production PostgreSQL / Supabase deployments).
- **PostgreSQL / Supabase Production**: Uses connection pooling, parameterized queries, and Row-Level Security (RLS) policies.
- **Fail-Fast Invariant**: In production (`NODE_ENV=production`), the application strictly validates PostgreSQL connectivity and will not silently fall back to an ephemeral database.

---

## 🔗 API Reference

Base Endpoint: `/api/v1`

### Authentication (`/api/v1/auth`)
- `POST /login` — Demo and credential authentication
- `POST /verify` — Validates current session token and returns user profile
- `POST /logout` — Invalidates session token

### Practice Problems (`/api/v1/practice`)
- `GET /problems` — List all 80 Practice problems with filters (`topic`, `difficulty`, `pattern`, `status`, `search`)
- `GET /problems/:id` — Get detailed problem specification and test cases
- `POST /problems/:id/start` — Mark problem as in-progress
- `POST /problems/:id/abandon` — Explicitly abandon/skip problem
- `POST /problems/:id/submission` — Record practice solve attempt
- `GET /progress` — Student-specific completion stats and topic breakdown
- `GET /topics` — List all 8 practice topics and problem counts
- `GET /patterns` — List approved pattern taxonomy

### Code Execution (`/api/v1/code`)
- `POST /run` — Execute code against public test cases or custom stdin
- `POST /submit` — Evaluate code against full test suite and update progress
- `GET /submissions/:question_id` — Fetch user's submission history for a problem

### Admin Management (`/api/v1`)
- `GET /questions` — Paginated admin question bank
- `POST /questions` — Create new question (Admin)
- `PUT /questions/:id` — Update question details and create revision (Admin)
- `DELETE /questions/:id` — Soft-delete / archive question (Admin)
- `POST /ai-questions/generate` — Generate language-independent question via LLM (Admin)
- `GET /daily-question` / `POST /daily-question` — Read or set the daily challenge (Admin)
- `GET /admin/audit-logs` — Read security and modification audit trail (Admin)

---

## 📁 Project Structure

```text
axly-dsa-tracker/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Express route controllers
│   │   ├── routes/           # REST API routes under /api/v1
│   │   ├── services/         # Business logic (execution, scoring, practice, AI)
│   │   ├── middleware/       # Auth, RBAC, error handling, rate limiting
│   │   ├── validation/       # Zod request validation schemas
│   │   ├── db/               # Repository abstractions, schema, and seed data
│   │   │   └── data/         # 80-problem compressed dataset & taxonomies
│   │   ├── app.js            # Express app configuration & middleware
│   │   └── server.js         # HTTP server entry point
│   ├── scripts/              # Validation, seeding, and migration scripts
│   ├── tests/                # Jest backend integration and execution test suites
│   ├── .env.example          # Environment variable template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components (Sidebar, Modals, Navbar)
│   │   ├── pages/            # Application pages (Dashboard, Practice, Workspace, Admin)
│   │   ├── services/         # API client bindings
│   │   ├── context/          # React Auth and theme contexts
│   │   ├── App.jsx           # Routing and role-based route guards
│   │   └── index.css         # Design system & Tailwind styling
│   └── package.json
│
├── database/
│   ├── migrations/           # PostgreSQL DDL migrations
│   └── policies/             # Supabase Row Level Security (RLS) SQL policies
│
├── docs/                     # Technical documentation & API specs
├── tests/
│   └── e2e/                  # Playwright end-to-end test suites
│
└── README.md
```

---

## 🧪 Testing & Verification Status

### Test Commands:

**Backend Jest Test Suites:**
```bash
npm --prefix backend test
```

**Frontend Production Build:**
```bash
npm --prefix frontend run build
```

**Playwright End-to-End Suite:**
```bash
npx playwright test
```

### Current Test Verification:
```text
Backend Test Suite:      100/100 passed (9 test suites)
Frontend Production:     Vite build PASS (0 errors, 1,555 modules transformed)
Playwright E2E Suite:    14/14 passed (100% pass across student & admin journeys)
Practice Problem Bank:   80/80 problems validated and executable
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python / GCC / OpenJDK**: (Optional, for running native multi-language runner locally)

### 2. Backend Installation & Start
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Backend runs on: `http://localhost:5000`

### 3. Frontend Installation & Start
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

---

## 🧭 V1 Scope vs. Future Roadmap

### ✅ Current V1 Implementation (Fully Shipped & Verified)
- 80-Question Curated Practice Problem Bank
- 8 Topic Distributions with Controlled Pattern Taxonomy
- Multi-Language In-Platform Code Workspace (6 Languages)
- Sandboxed Standard I/O Code Execution & Custom Stdin
- Practice Start/Continue/Review/Abandon Lifecycle (0 competitive points)
- Daily Challenge with UTC sync, Streak tracking, and 100-point scoring
- Competitive All-Time and Periodic Leaderboard
- Admin Question Bank CRUD, Versioning, and Soft-Deletion
- Language-Agnostic AI Question Generator
- Student Submission Reviews & Mentor Feedback
- PostgreSQL/Supabase production adapter with SQLite local compatibility

### 🔮 Future V2 Roadmap (Deferred)
- Interactive Learning Paths with prerequisite unlocking graphs
- Machine learning-driven personalized problem recommendations
- Timed multi-problem cohort contests and custom tournaments
- Gamified achievement badges and visual XP levels
- Expanded Graph Algorithms & Backtracking problem libraries

---

## 📄 License

This project is licensed under the MIT License.
