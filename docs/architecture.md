# Axly DSA Tracker — System Architecture

---

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  React 18 + Vite + Tailwind CSS                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Dashboard  │  │  Practice    │  │  Daily Challenge  │   │
│  │  (Stats,    │  │  Workspace   │  │  (UTC-synced)     │   │
│  │  Streaks)   │  │  + AI Coach  │  │                   │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────-┘
                          │ /api/v1
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                     Express.js API                           │
│  Helmet │ CORS │ Rate Limiter │ Morgan │ JWT Auth │ RBAC      │
│                                                              │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐   │
│  │ Practice │ │  Daily  │ │   Code   │ │   DSA AI       │   │
│  │ Routes   │ │Challenge│ │Execution │ │   Coach        │   │
│  └──────────┘ └─────────┘ └──────────┘ └────────────────┘   │
└──────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌──────────────────────────┐
│  Repository      │          │  DSA AI 4-Phase Engine   │
│  Factory         │          │                          │
│  ┌────────────┐  │          │  Phase 1: Deterministic  │
│  │ SQLite     │  │          │  Phase 2: LLM Router     │
│  │ (dev/test) │  │          │  Phase 3: Coach Actions  │
│  └────────────┘  │          │  Phase 4: Frontend       │
│  ┌────────────┐  │          └──────────────────────────┘
│  │ PostgreSQL │  │                      │
│  │ (prod)     │  │                      ▼
│  └────────────┘  │          ┌──────────────────────────┐
└──────────────────┘          │ Exact 5-Slot LLM Chain   │
                              │ Groq1 → Gemini1 → Groq2  │
                              │ → Gemini2 → Groq3         │
                              └──────────────────────────┘
```

---

## Repository Architecture (Dual-Driver)

The application uses a repository factory pattern that allows the same codebase to run on SQLite (development/testing) and PostgreSQL (production) without any service-level changes.

```
repositoryFactory.js
  ├── getDatabaseDriver()          reads DATABASE_URL or NODE_ENV
  ├── getRepository()              returns cached singleton repository
  │
  ├── SqliteRepository             better-sqlite3, synchronous queries
  │     └── formatSql()           pass-through (? placeholders)
  │
  └── PostgresRepository           pg pool, async queries
        └── formatSql()           translates ? → $1, $2, $3, ...
```

**Lazy initialization pattern:** All services call `getRepository()` at query time (not at module load). This prevents initialization race conditions during database setup and test isolation.

---

## DSA AI Engine — 4 Phases

### Phase 1: Deterministic Foundation (`dsaAiService.js`)

```
User Query
    │
    ▼
Intent Classifier
    │  Keywords: "hint", "explain", "approach", "solution",
    │  "complexity", "review", "debug", "test case", "concept"
    ▼
Problem Matcher
    │  1. Match by problemId (exact)
    │  2. Match by slug (normalized)
    │  3. Match by title (fuzzy keywords)
    ▼
Knowledge Graph Lookup
    │  Fetches: hints, pattern, complexity, topic from DB
    ▼
Response (0 LLM tokens for known problems)
```

**Guarantees:**
- Read-only: never writes to `practice_progress`, `submissions`, or scoring tables
- Hidden test cases never fetched or exposed

---

### Phase 2: LLM Router (`llmRouter.js`)

The production fallback chain is intentionally slot-based. Each Groq slot receives exactly one Groq key, preventing the Groq provider from exhausting all three keys before Gemini is attempted.

```
llmRouter.generate(options)
    │
    ▼
getConfiguredProviders()
    │
    ├─► Slot 1: Groq Key 1 / GPT-OSS 120B
    │       │ fail
    │       ▼
    ├─► Slot 2: Gemini Key 1 / Gemini 3.1 Flash-Lite
    │       │ fail
    │       ▼
    ├─► Slot 3: Groq Key 2 / GPT-OSS 120B
    │       │ fail
    │       ▼
    ├─► Slot 4: Gemini Key 2 / Gemini 3.6 Flash-Lite
    │       │ fail
    │       ▼
    ├─► Slot 5: Groq Key 3 / GPT-OSS 120B
    │       │ fail
    │       ▼
    └─► graceful fallback response
```

Each configured slot is attempted in order. A successful non-empty completion returns immediately. Provider failures are sanitized and recorded for server-side diagnostics. OpenRouter/OpenAI remain available only when explicitly registered/ordered for compatibility and are not part of the default five-slot chain.

**Provider Contract (`baseProvider.js`):**
```js
class BaseLLMProvider {
  isConfigured()              // returns bool — whether keys are set
  generate(options)           // { prompt, systemPrompt, maxTokens, temperature, timeoutMs }
  fetchWithTimeout(url, body, headers, timeoutMs)  // shared HTTP implementation
}
```

### LLM Environment Configuration

```text
GROQ_API_KEY_1 + LLM_MODEL
GEMINI_API_KEY_1 + GEMINI_MODEL_1
GROQ_API_KEY_2 + LLM_MODEL
GEMINI_API_KEY_2 + GEMINI_MODEL_2
GROQ_API_KEY_3 + LLM_MODEL
```

The router defaults to the requested model IDs when the Gemini model variables are omitted.

---

### Phase 3: Coach Actions (`dsaAiCoachService.js`)

Each action follows:
```
1. Run Phase 1 analysis
2. If DB has verified answer → return it (source: "database")
3. Else → assemble prompt → call Phase 2 LLM Router → return result (source: "llm")
4. If action requires verification → run executionService.executeCode()
5. Self-correct up to MAX_CORRECTION_ATTEMPTS (2) if tests fail
```

---

### Phase 4: Frontend Integration

- `DsaAiCoachPanel.jsx`: rendered inside Problem Workspace when a problem is loaded
- `App.jsx` global sidebar: always accessible for general DSA queries
- Context detection: `problemId` present → grounded mode; absent → global mode
- All AI calls go through `api.js` → `/api/v1/dsa-ai/*` — keys never touch the browser

---

## Code Execution Sandbox (`executionService.js`)

```
executeCode({ language, sourceCode, testCases, isSubmit })
    │
    ├── External Runner (CODE_EXECUTION_SERVICE_URL configured)?
    │   ├── YES → POST to remote runner → normalize response → return
    │   └── NO (or runner failed) → fall through to local sandbox
    │
    └── executeLocally()
            │
            ├── Write source to temp dir (os.tmpdir())
            ├── Dispatch by language:
            │   ├── js/node   → spawn('node', [filePath])
            │   ├── python    → spawn('python3', [filePath])
            │   ├── ts        → spawn('npx', ['ts-node', '--skip-project', filePath])
            │   ├── java      → shell: javac Main.java && java -cp <dir> Main
            │   ├── cpp       → shell: g++ -O2 -o a.out file.cpp && ./a.out
            │   └── c         → shell: gcc -o a.out file.c && ./a.out
            │
            ├── runProcess() with:
            │   ├── 5,000 ms timeout (SIGKILL)
            │   ├── 64 KB stdout cap
            │   └── stdin piped from test case input
            │
            └── Cleanup: rm -rf tempDir (always, in finally block)
```

---

## Scoring & Point Separation

```
Practice Submission
    │
    └── practiceService.recordPracticeSubmission()
            └── gamificationService.awardPracticeSolve()
                    └── Points awarded: 0 (invariant — no leaderboard impact)

Daily Challenge Submission
    │
    └── recordAttempt() → scoringService
            └── gamificationService.awardDailyChallengeSolve()
                    ├── Base points: 50 / 100 / 150 (easy / medium / hard)
                    ├── Streak bonus: +10 per consecutive day (max 5 days)
                    └── Updates leaderboard_score, streak, longest_streak
```

---

## Database Schema Overview

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User profiles, roles, points, streak |
| `questions` | Global question bank (admin-managed) |
| `question_versions` | Immutable version history per question edit |
| `test_cases` | Test cases linked to `questions` |
| `submissions` | User submission records (status, scores) |
| `code_submissions_log` | Raw execution log per submission |
| `assignments` | Cohort-based problem assignments |

### Practice Tables
| Table | Purpose |
|-------|---------|
| `practice_problems` | 80-problem curated bank |
| `practice_test_cases` | Practice test cases (public + hidden) |
| `practice_progress` | Per-user problem status (not_started → solved) |
| `practice_patterns` | Pattern taxonomy |
| `practice_topics` | Topic taxonomy |

### Daily Challenge Tables
| Table | Purpose |
|-------|---------|
| `daily_challenge_problems` | Scheduled challenges with lifecycle state |
| `daily_challenge_test_cases` | Challenge test cases (public + hidden) |
| `daily_challenge_topics` | Challenge topic taxonomy |

### AI & Observability
| Table | Purpose |
|-------|---------|
| `dsa_knowledge_graph` | Verified hints, patterns, complexities per problem |
| `audit_logs` | Immutable admin action log |
| `notifications` | Per-user notification queue |

---

## Security Layers

```
Request
    │
    ├── Helmet (HTTP security headers)
    ├── CORS (allowlist: localhost:5173, dsatracker.axly.in)
    ├── express-rate-limit (global + per-route)
    ├── JWT authenticate middleware
    ├── RBAC requireRole('admin') on admin routes
    ├── Zod validation on request bodies
    │
    └── Handler
            ├── Code execution: sandboxed subprocess, no network
            ├── Hidden tests: never returned in any response
            ├── LLM keys: sanitized from all errors via sanitizeError()
            └── Audit log: all admin mutations recorded
```
