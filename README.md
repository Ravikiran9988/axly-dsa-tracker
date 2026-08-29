# Axly DSA Tracker

> A production-grade Data Structures & Algorithms practice and learning platform featuring an 80-problem curated Practice Bank, competitive Daily Challenges, an integrated **DSA AI Coach** with Groq multi-key failover and sandbox verification, an in-platform sandboxed code editor supporting 6 languages, detailed progress analytics, and comprehensive admin content management.

**Production URL:** `https://dsatracker.axly.in`  
**Repository:** `https://github.com/Ravikiran9988/axly-dsa-tracker`

---

## 📌 Overview

**Axly DSA Tracker** provides a structured environment for students to master algorithmic problem-solving and for administrators to manage curriculum, track submissions, and audit learner progress.

The platform provides two primary student tracks:
1. **Self-Paced Practice Library**: 80 curated problems mapped to a strict pattern taxonomy (0 competitive score, pure personal mastery).
2. **Competitive Daily Challenge**: One global daily algorithmic challenge per UTC day (100 points, streak maintenance, and leaderboard ranking).
3. **DSA AI Coach**: Deterministic database/knowledge graph first AI tutor with Groq multi-key failover (`openai/gpt-oss-120b`) and sandbox code verification.

Students write, execute, and submit code directly in the platform via a sandboxed code editor, or submit repository links for mentor review.

---

## ✨ Core Features

### 🤖 DSA AI Coach & Intelligence (V1)
- **Deterministic-First Grounding**: Fulfills known practice problem queries directly from database hints and taxonomy knowledge graph with **0 LLM cost**.
- **Groq Multi-Key Failover Engine**:
  - Model: `openai/gpt-oss-120b`
  - High-availability failover across `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, and `GROQ_API_KEY_3`.
  - Health-aware cooldown: Automatically skips rate-limited (HTTP 429), timed out, or failing keys and fails over to the next healthy key without latency penalty.
  - Returns graceful fallback when all keys are exhausted without crashing.
- **Progressive Hint Engine**: Delivers progressive guidance (Hint 1 -> Hint 2 -> Algorithmic Approach Nudge) without disclosing full solution code.
- **Comprehensive Actions**:
  - `Hint`: Progressive hints.
  - `Explain`: Core idea, mechanism, pattern, and complexity.
  - `Approach`: Algorithmic strategy and invariants.
  - `Solution`: Optimal code generation and complexity.
  - `Complexity`: Explicit Time & Space Big-O breakdown.
  - `Review Code`: Analyzes student code for bugs, edge cases, complexity, and cleanliness.
  - `Debug`: Root cause analysis and targeted fix guidance.
- **Sandbox Code Verification**: Generated and student code is tested in the existing execution sandbox against test cases with bounded self-correction (max 2 attempts).
- **Strict Isolation Guarantees**:
  - Read-only: DSA AI never modifies practice problem status (`practice_progress`).
  - Never modifies competitive points, daily streaks, or leaderboards.
  - Hidden test cases are strictly protected and never exposed.
  - API keys are never exposed to frontend or logged in telemetry.

### 🎓 Student Experience
- **Authentication & Profiles**: Secure session management and demo login options for local testing.
- **Student Dashboard**: Quick access to the active Daily Challenge, topic mastery stats, and practice quick-launch.
- **Practice Problem Bank**: 80 hand-crafted problems with multi-dimensional filtering (Search, Topic, Pattern, Difficulty, Status).
- **In-Platform Problem Workspace**:
  - Problem statement, constraints, example test cases, hints, and past submission history.
  - Integrated **Ask DSA AI** tab and quick trigger buttons.
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
  - Generates full problem specifications based on Topic, Difficulty, and desired Test Case count.
  - Enforces language-independent problem design solvable via standard I/O.
- **Daily Challenge Scheduler**: Set, schedule, or override the active problem for any UTC date.
- **Learner Oversight**: Inspect student rosters, individual progress breakdowns, and code submission histories.
- **Submission Reviews**: Grade, review, and leave structured mentor feedback on student code.
- **Security Audit Logs**: Immutable audit log of all administrative actions, question updates, and user state changes.

---

## 🎯 Practice System vs. Daily Challenge

To ensure a balanced learning and competitive experience, Axly enforces a strict separation between Practice and Daily Challenge:

| Feature | Practice Problem Bank | Daily Challenge | DSA AI Coach |
| :--- | :--- | :--- | :--- |
| **Objective** | Comprehensive curriculum mastery | Daily consistency & competition | Pedagogical guidance & code review |
| **Curriculum Scope** | 80 curated problems across 8 topics | 1 selected problem per UTC day | Grounded on active problem or novel DSA query |
| **Pacing** | Self-paced (`Start`, `Continue`, `Abandon`) | 24-hour UTC window per challenge | On-demand instant response |
| **Competitive Points** | **0 points** (Pure learning invariant) | **+100 points** per first solve | **0 points** (Read-only) |
| **Daily Streak** | Does **not** affect Daily Streak | Increments consecutive streak | Does **not** affect Daily Streak |
| **Leaderboard Impact**| Does **not** affect Leaderboard | Directly updates Leaderboard | Does **not** affect Leaderboard |
| **Solved Status** | Only via accepted code submission | Only via accepted challenge submit | **Never marks problems solved** |

---

## 🤖 DSA AI Architecture

```text
User Question / Code / Action
          ↓
DSA AI Coach Service
          ↓
Deterministic Problem Matcher & Knowledge Graph
          ↓
Has verified DB hint / solution?
    ├── YES ──> Database / Graph Response (0 LLM Tokens)
    └── NO  ──> Token-Controlled Prompt Assembly
                      ↓
               Groq Multi-Key Router (openai/gpt-oss-120b)
                      ↓
                 GROQ_API_KEY_1
                      ↓ failure / 429 / timeout (cooldown)
                 GROQ_API_KEY_2
                      ↓ failure / 429 / timeout (cooldown)
                 GROQ_API_KEY_3
                      ↓ all failed
                 Graceful Fallback Response
                      ↓
               Sandbox Verification (executionService)
                      ↓
                 Self-Correction (max 2 attempts)
```

---

## ⚙️ Environment Variables

Configure the following variables in `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your-random-secret-at-least-32-characters
JWT_EXPIRES_IN=30d

# Database (Supabase PostgreSQL / SQLite fallback)
DATABASE_URL=your-database-url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DSA AI & Groq Multi-Key Failover Configuration
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
GROQ_API_KEY_1=your-first-groq-api-key
GROQ_API_KEY_2=your-second-groq-api-key
GROQ_API_KEY_3=your-third-groq-api-key

# Optional provider fallback order
LLM_PROVIDER_ORDER=groq,gemini,openrouter,openai
```

---

## 🚀 Quick Start & Running Locally

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database Setup & Seeding
```bash
cd backend
npm run db:init
npm run db:seed
```

### 3. Run Automated Tests
```bash
cd backend
npm test
```
*Executes all 21 test suites (249 tests) covering DSA AI, Groq multi-key failover, code execution sandbox, streak separation, and admin workflows.*

### 4. Start Development Servers
```bash
# Start backend (Port 5000)
cd backend && npm run dev

# Start frontend (Port 5173)
cd frontend && npm run dev
```

### 5. Build for Production
```bash
cd frontend
npm run build
```

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

## 📄 License & Attribution

Built for the **Axly DSA Tracker** platform. All rights reserved.
