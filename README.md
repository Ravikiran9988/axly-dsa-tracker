<div align="center">

# Axly DSA Tracker

**Production-grade Data Structures & Algorithms learning platform with competitive Daily Challenges, an 80-problem curated Practice Bank, and a 4-phase DSA AI Coach powered by Groq.**

[![Tests](https://img.shields.io/badge/tests-249%20passed-brightgreen?style=flat-square)](#-testing)
[![Suites](https://img.shields.io/badge/suites-21%20passed-brightgreen?style=flat-square)](#-testing)
[![Languages](https://img.shields.io/badge/languages-JS%20%7C%20Python%20%7C%20TS%20%7C%20Java%20%7C%20C%20%7C%20C++-blue?style=flat-square)](#-code-execution-sandbox)
[![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20SQLite%20%7C%20PostgreSQL-informational?style=flat-square)](#-technology-stack)

**Production:** `https://dsatracker.axly.in`
**Repository:** `https://github.com/Ravikiran9988/axly-dsa-tracker`

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Feature Set](#-feature-set)
- [DSA AI Architecture](#-dsa-ai-architecture-4-phases)
- [Practice vs Daily Challenge vs AI](#-practice-vs-daily-challenge-vs-ai)
- [80-Problem Practice Dataset](#-80-problem-practice-dataset)
- [Technology Stack](#-technology-stack)
- [Code Execution Sandbox](#-code-execution-sandbox)
- [Environment Variables](#%EF%B8%8F-environment-variables)
- [Quick Start](#-quick-start)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [API Overview](#-api-overview)
- [Security Model](#-security-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧭 Overview

**Axly DSA Tracker** is a full-stack platform designed for structured algorithmic learning and competitive daily practice. It combines three tightly integrated systems:

| System | Purpose |
|--------|---------|
| **Practice Bank** | 80 hand-curated DSA problems for self-paced learning across 8 topics and 3 difficulty tiers |
| **Daily Challenge** | One global UTC-synced competitive challenge per day — same problem for all students |
| **DSA AI Coach** | 4-phase deterministic-first AI tutor with Groq multi-key failover and sandboxed code verification |

These systems operate under **strict point separation**: Practice problems award zero competitive points. Only Daily Challenge completions affect the leaderboard and streak counters.

---

## ✨ Feature Set

### 🤖 DSA AI Coach (4-Phase Architecture)

#### Phase 1 — Deterministic Foundation (Zero LLM Cost)
- Intent detection: `HINT`, `EXPLAIN`, `APPROACH`, `SOLUTION`, `COMPLEXITY`, `CODE_REVIEW`, `DEBUG`, `TEST_CASE`, `CONCEPT`
- Problem Matcher: maps questions to known practice problems via fuzzy slug, title, and keyword matching
- Knowledge Graph: stores verified hints, patterns, complexities, and taxonomy per problem
- Returns complete responses directly from the database for known problems — **no LLM call made**

#### Phase 2 — LLM Router & Groq Multi-Key Failover
- **Primary Provider**: Groq (`openai/gpt-oss-120b`)
- **Failover**: `GROQ_API_KEY_1` → `GROQ_API_KEY_2` → `GROQ_API_KEY_3`
- Health-aware cooldown: rate-limited (HTTP 429) or timed-out keys enter exponential backoff; healthy keys serve immediately
- Provider abstraction: adding a new LLM provider requires implementing one `generate()` interface method
- Keys sanitized from error messages; never logged or exposed to the frontend

#### Phase 3 — DSA AI Coach Actions

| Action | Source Priority | Description |
|--------|----------------|-------------|
| `HINT` | Database → LLM | Progressive hints (1 → 2 → Approach nudge). Never reveals full solution |
| `EXPLAIN` | Database → LLM | Core idea, mechanism, pattern, and complexity |
| `APPROACH` | Database → LLM | Algorithmic strategy and invariants |
| `SOLUTION` | LLM + Sandbox | Optimal solution with sandbox verification (max 2 self-corrections) |
| `COMPLEXITY` | Database → LLM | Explicit Time & Space Big-O breakdown |
| `CODE_REVIEW` | LLM + Analysis | Bug detection, edge cases, readability, and complexity review |
| `DEBUG` | LLM | Root cause analysis and targeted fix guidance |
| `TEST_CASE` | Database → LLM | Representative test input generation |
| `CONCEPT` | Database → LLM | Topic-level concept explanation |

**Strict read-only guarantees**: DSA AI never modifies practice status, competitive scores, streaks, or leaderboards. Hidden test cases are never exposed.

#### Phase 4 — Frontend Integration
- Embedded `DsaAiCoachPanel` in the Problem Workspace (context-aware per problem)
- Global sidebar AI mode for general DSA queries ("No problem selected — ask any DSA question.")
- Graceful degradation when all LLM keys are exhausted

---

### 🎓 Student Experience
- Secure JWT sessions with Supabase integration; dev login for local testing
- Dashboard with Daily Challenge widget (clickable → opens challenge), streak counters, score, rank
- Problem Workspace with statement, constraints, examples, hints, past submissions, AI panel, code editor
- Multi-language starter templates auto-generated per problem
- Run Code (public tests / custom input) and Submit (all tests incl. hidden)
- GitHub URL submission pathway for mentor review
- Visual practice progress with topic-by-topic Easy/Medium/Hard breakdown
- Competitive leaderboard ordered by points, streak, name

### 🛡️ Admin Experience
- Command Center: active students, submission volume, pending reviews, question stats
- Question Bank: Full CRUD, version history, publish/unpublish, soft-delete, rollback comparison
- AI Question Generator: complete problem specs via LLM for any topic and difficulty
- Daily Challenge Scheduler: set, schedule, publish, or archive by UTC date
- Student Roster: individual progress and code submission history
- Submission Reviews: grade GitHub submissions with structured mentor feedback
- Security Audit Logs: immutable record of all admin operations

---

## 🤖 DSA AI Architecture (4 Phases)

```
User Question / Code / Action
          │
          ▼
  DSA AI Coach Service (Phase 1 — Deterministic)
  ├── Intent Detection
  ├── Problem Matcher
  └── Knowledge Graph Lookup
          │
    Known answer?
   ┌──────┴──────┐
  YES            NO
   │              │
   ▼              ▼
Database      LLM Router (Phase 2)
Response      ├─► GROQ_API_KEY_1
(0 tokens)    │       │ fail / 429 / timeout
              ├─► GROQ_API_KEY_2
              │       │ fail / 429 / timeout
              ├─► GROQ_API_KEY_3
              │       │ all failed
              └─► Graceful Fallback
                        │
                        ▼
             Sandbox Verification (Phase 3)
             executionService.js
             Max 2 Self-Corrections
```

---

## 📊 Practice vs Daily Challenge vs AI

| Feature | Practice Bank | Daily Challenge | DSA AI Coach |
|---------|--------------|-----------------|--------------|
| **Scope** | 80 problems, 8 topics | 1 problem / UTC day | Any DSA query |
| **Pacing** | Self-paced | 24-hour UTC window | On-demand |
| **Competitive Points** | **0 pts** | **+50 / +100 / +150 pts** | **0 pts** |
| **Daily Streak** | No effect | Increments on solve | No effect |
| **Leaderboard** | No effect | Directly ranked | No effect |
| **Marks Solved** | Via code submission | Via challenge submit | **Never** |
| **Hidden Tests** | Evaluated on submit | Evaluated on submit | **Never exposed** |

---

## 📚 80-Problem Practice Dataset

Exactly **80 hand-curated problems** balanced across 8 core topics:

```
Arrays                      12 problems
Strings                     10 problems
Hashing                      8 problems
Two Pointers / Sliding Win  10 problems
Stack                        8 problems
Binary Search                8 problems
Trees                       12 problems
Dynamic Programming         12 problems
                    Total:  80 problems
```

### Algorithmic Pattern Taxonomy (14 patterns)

| Slug | Display Name |
|------|-------------|
| `two-pointers` | Two Pointers |
| `sliding-window` | Sliding Window |
| `fast-slow-pointers` | Fast & Slow Pointers |
| `hash-map-lookup` | Hash Map Lookup |
| `prefix-sum` | Prefix Sum |
| `kadanes-algorithm` | Kadane's Algorithm |
| `monotonic-stack` | Monotonic Stack |
| `binary-search` | Binary Search |
| `binary-search-on-answer` | Binary Search on Answer |
| `tree-bfs` | Tree BFS / Level Order Traversal |
| `tree-dfs` | Tree DFS |
| `tree-recursion` | Tree Recursion |
| `1d-dp` | 1D Dynamic Programming |
| `2d-dp` | 2D Dynamic Programming |

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Backend** | Node.js 18, Express.js |
| **Auth** | JWT (`jsonwebtoken`), Supabase Auth |
| **Database (Production)** | PostgreSQL / Supabase with Row-Level Security |
| **Database (Development)** | SQLite via `better-sqlite3` |
| **AI / LLM** | Groq (`openai/gpt-oss-120b`) via OpenAI-compatible API |
| **Code Execution** | Sandboxed subprocess with optional remote runner |
| **Testing** | Jest 29, Supertest |
| **Security** | Helmet, CORS allowlist, express-rate-limit, RBAC |
| **Logging** | Morgan with request ID correlation headers |

---

## 💻 Code Execution Sandbox

The execution engine supports 6 languages:

| Language | Execution Model | Command |
|----------|----------------|---------|
| **JavaScript** | Direct spawn | `node solution.js` |
| **Python** | Direct spawn | `python3 solution.py` |
| **TypeScript** | Transpile + run | `npx ts-node --skip-project solution.ts` |
| **Java** | Compile + run | `javac Main.java && java -cp <dir> Main` |
| **C++** | Compile + run | `g++ -O2 -o a.out solution.cpp && ./a.out` |
| **C** | Compile + run | `gcc -o a.out solution.c && ./a.out` |

**Sandbox limits**: 5,000 ms timeout · 64 KB output cap · 100 KB source limit · 20 test cases max

---

## ⚙️ Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
TRUST_PROXY=false

# Auth
JWT_SECRET=your-random-secret-minimum-32-characters
JWT_EXPIRES_IN=30d

# Database — Production (PostgreSQL / Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DSA AI — Groq Multi-Key Failover
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
GROQ_API_KEY_1=gsk_your_first_key
GROQ_API_KEY_2=gsk_your_second_key
GROQ_API_KEY_3=gsk_your_third_key

# Optional: provider fallback order
LLM_PROVIDER_ORDER=groq,gemini,openrouter,openai

# Code Execution (optional remote runner)
CODE_EXECUTION_SERVICE_URL=
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- (For compiled language execution) Java JDK 11+, GCC/G++, `ts-node`

### 1. Clone & Install

```bash
git clone https://github.com/Ravikiran9988/axly-dsa-tracker.git
cd axly-dsa-tracker

npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Fill in your values
```

### 3. Start Development Servers

```bash
# Terminal 1 — Backend API (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Production Build

```bash
cd frontend && npm run build
```

---

## 🧪 Testing

```bash
cd backend && npm test
```

**Result: 21 suites / 249 tests / 0 failures**

| Test Suite | Area |
|-----------|------|
| `dsa_ai_foundation.test.js` | Phase 1 — intent detection, problem matching |
| `dsa_ai_router.test.js` | Phase 2 — LLM router, Groq failover |
| `dsa_ai_coach.test.js` | Phase 3 — all coach actions, sandbox verification |
| `dsa_ai_complete_validation.test.js` | End-to-end 4-phase validation |
| `dsa_ai_groq_multikey.test.js` | Multi-key failover, cooldown, key sanitization |
| `phase4_comprehensive.test.js` | Phase 4 — frontend API contracts |
| `execution.test.js` | Code execution sandbox |
| `practice_v1_complete.test.js` | 80-problem seed integrity, topic distribution |
| `practice_integrity_execution.test.js` | Practice lifecycle, point isolation |
| `daily_challenge_architecture.test.js` | Single source of truth, UTC behavior |
| `daily_challenge_dynamic_topics.test.js` | Topic taxonomy, scheduling |
| `daily_challenge_ai_and_admin.test.js` | Admin scheduling, publish/archive |
| `streakSeparation.test.js` | Practice/Daily streak isolation |
| `scoringService.test.js` | Points, streak bonus, leaderboard |
| `auth_flow.test.js` | JWT, session, role provisioning |
| `jwt_auth.test.js` | Token validation, expiry |
| `api.test.js` | Core endpoint smoke tests |
| `admin_stats.test.js` | Admin analytics |
| `audit_and_lifecycle.test.js` | Audit log integrity |
| `notificationService.test.js` | Notification delivery |
| `rls_supabase.test.js` | Row-Level Security contracts |

> LLM providers are mocked in tests. No real Groq API calls are made.

---

## 📁 Project Structure

```
axly-dsa-tracker/
├── backend/
│   ├── src/
│   │   ├── app.js                     # Express app, middleware, routes
│   │   ├── server.js                  # Boot sequence, DB init, seed
│   │   ├── controllers/
│   │   │   ├── codeExecutionController.js
│   │   │   ├── dailyChallengeController.js
│   │   │   ├── dsaAiController.js
│   │   │   └── practiceController.js
│   │   ├── db/
│   │   │   ├── db.js                  # SQLite init & schema
│   │   │   ├── postgresRepository.js  # PostgreSQL driver (? → $N)
│   │   │   ├── repositoryFactory.js   # Driver selector
│   │   │   ├── practiceSeed.js        # 80-problem compressed seed
│   │   │   └── seed.js                # Core app seed data
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT auth + role provisioning
│   │   │   ├── rbac.js                # Role-based access control
│   │   │   └── errorHandler.js        # AppError + global error format
│   │   ├── routes/
│   │   └── services/
│   │       ├── dsaAiService.js        # Phase 1 deterministic analysis
│   │       ├── dsaAiCoachService.js   # Phase 3 coach dispatch
│   │       ├── executionService.js    # Code sandbox (6 languages)
│   │       ├── dailyChallengeService.js
│   │       ├── gamificationService.js
│   │       ├── scoringService.js
│   │       └── llm/
│   │           ├── llmRouter.js       # Phase 2 multi-provider router
│   │           ├── groqProvider.js    # Groq multi-key failover
│   │           └── baseProvider.js    # Provider interface contract
│   ├── tests/                         # 21 Jest test suites
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main router + navigation
│   │   ├── components/
│   │   │   ├── DsaAiCoachPanel.jsx    # AI coach panel
│   │   │   └── DailyQuestionCard.jsx  # Dashboard challenge card
│   │   ├── pages/
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── DailyChallenge.jsx
│   │   │   └── ProblemWorkspace.jsx
│   │   └── services/
│   │       └── api.js                 # All API calls (/api/v1)
│   └── package.json
└── docs/
    ├── api-reference.md               # Full REST API reference
    ├── architecture.md                # System architecture deep-dive
    ├── PRODUCT_RULES.md               # Canonical scoring & product rules
    └── leaderboard-rules.md           # Leaderboard ordering rules
```

---

## 📡 API Overview

Base URL: `/api/v1` · Auth: `Authorization: Bearer <jwt>`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Authenticate, receive JWT |
| `/auth/verify` | POST | Validate session, return user profile |
| `/practice/problems` | GET | Browse 80-problem bank |
| `/practice/problems/:id/start` | POST | Mark problem as in-progress |
| `/practice/progress` | GET | Personal topic progress breakdown |
| `/code/run` | POST | Execute against public test cases |
| `/code/submit` | POST | Submit against all tests (incl. hidden) |
| `/daily-challenges/today` | GET | Today's Daily Challenge |
| `/dsa-ai/coach` | POST | AI coach — hints, explain, approach, solution |
| `/dsa-ai/analyze` | POST | Phase 1 deterministic analysis |
| `/dsa-ai/generate` | POST | LLM-backed guidance |
| `/dsa-ai/verify` | POST | Sandbox code verification |
| `/users/leaderboard` | GET | Competitive leaderboard |
| `/analytics/me` | GET | Personal analytics |

Full reference: [`docs/api-reference.md`](docs/api-reference.md)

---

## 🔒 Security Model

| Concern | Implementation |
|---------|---------------|
| **Authentication** | JWT only; secrets from environment variables |
| **Authorization** | RBAC middleware (`requireRole('admin')`) on all admin routes |
| **API Keys** | Never returned to frontend; stripped from all error messages and logs |
| **Rate Limiting** | Global: 500 req/15min (production) · AI: 100 req/15min |
| **Code Execution** | Sandboxed subprocess; 5s timeout; 64KB output cap; no network access |
| **Hidden Tests** | Inputs/outputs never appear in any API response |
| **SQL Injection** | Parameterized queries; `?` auto-translated to `$N` for PostgreSQL |
| **CORS** | Explicit allowlist; no wildcard in production |
| **Security Headers** | Helmet on all responses |
| **Audit Trail** | Immutable audit log table for all admin actions |

---

## 🤝 Contributing

1. Fork and create a feature branch: `git checkout -b feature/your-feature`
2. Run the full test suite before pushing: `cd backend && npm test`
3. Ensure frontend builds cleanly: `cd frontend && npm run build`
4. Open a Pull Request with a clear description

**Rules:**
- Do not modify the 80-problem seed without updating topic validation
- Do not change Daily Challenge scoring without updating `docs/PRODUCT_RULES.md`
- New LLM providers must implement the `BaseLLMProvider` contract
- API keys must never appear in responses, logs, or error messages

---

## 📄 License

Built for the **Axly DSA Tracker** platform. All rights reserved.

© 2026 Axly. Unauthorized copying, distribution, or use is prohibited.
