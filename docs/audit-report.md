# Axly DSA Tracker — Complete System Audit Report

**Date:** September 2026
**Scope:** Full repository audit — read-only, no code changes

---

## 1. Executive Summary

Axly DSA Tracker is a **DSA (Data Structures & Algorithms) learning platform** with:
- **Frontend:** React 18 + Vite 5 + Tailwind CSS + shadcn/ui
- **Backend:** Express.js 4 + SQLite (dev) / PostgreSQL (prod)
- **AI System:** Multi-provider LLM router (Groq + Gemini) with RAG/novelty detection
- **Code Execution:** Docker-sandboxed runner supporting 6 languages
- **Deployment:** Heroku (backend) + Vercel (frontend)

### Key Metrics
| Metric | Value |
|--------|-------|
| Backend source files | ~100 |
| Frontend source files | ~67 |
| Database tables | 30 |
| API endpoints | ~100 |
| Backend test files | 36 |
| Playwright E2E specs | 9 |
| Services | 45 |
| Database migrations | 25 |

---

## 2. Current Architecture

### High-Level
- **Modular Monolith** — single Express.js instance, no microservices
- **Dual Database** — SQLite for dev/test, PostgreSQL for production
- **Repository Pattern** — `repositoryFactory.js` selects driver at runtime
- **Background Schedulers** — `setInterval`-based for Daily Challenge (00:30 IST) and Question Bank (every 2 hours)

### Data Flow
```
Browser → React SPA → Vite Dev Proxy → Express API → Repository → SQLite/PostgreSQL
                                      → LLM Router → Groq/Gemini
                                      → Docker Code Runner
```

---

## 3. Frontend Audit

### Stack
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 5.1 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| shadcn/ui | 4.21 | Component library |
| react-router-dom | 7.18 | Client routing |
| Supabase JS | 2.39 | Auth (Google OAuth) |
| React Hot Toast | 2.6 | Notifications |
| React Markdown | 10.1 | Markdown rendering |
| Lucide React | 0.359 | Icons |

### Pages (30 total)
- **Student (14):** Landing, Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, UserDashboard, AvailableChallenges, DailyChallenge, ProblemWorkspace, SubmissionHistory, StudentAnalytics, UserProfile, NotificationsPage, Leaderboard
- **Admin (10):** AdminCoreDashboard, AdminQuestions, AdminDailyChallenge, AdminUsers, AdminProgress, AdminSubmissions, AdminSubmissionsReview, AdminAuditLogs, AdminSettings, AdminProfile
- **Shared:** DsaAiCoachPanel (student), SubmissionReviewConsole (admin)

### Components (23 total)
- Navigation: Navbar, StudentNavbar, AdminNavbar, Sidebar, StudentSidebar, AdminSidebar
- Modals: AdminQuestionModal, AdminDailyChallengeModal, AdminScheduleDailyModal, AdminAssignModal, AdminCreateFromPracticeModal, DsaAiModal
- Cards: QuestionCard, DailyQuestionCard
- Other: DsaAiCoachPanel, AdminQuestionPreview, ProgressOverview, ErrorBoundary
- UI primitives: badge, button, card, input, index (shadcn/ui)

### Layouts (3)
- `MainLayout` — Primary router-based layout with `<Outlet />`
- `StudentLayout` — Legacy state-based view switching
- `AdminLayout` — Legacy state-based view switching

### Theme System
- `ThemeContext` + `localStorage` key `axly-theme`
- Light/dark via CSS variables on `:root` / `.dark`
- Tailwind `darkMode: 'class'`
- Toggle in Navbar (Sun/Moon icon)

### Known Frontend Issues
1. `StudentSidebar`/`AdminSidebar` lack mobile overlay support (consumes space on small screens)
2. `StudentNavbar` mobile drawer only shows profile + logout (no navigation)
3. `vite.config.js` monkey-patches source files at build time (fragile)
4. No `lg:` breakpoint usage beyond padding — no multi-column layouts

---

## 4. Backend Audit

### Stack
| Technology | Version | Purpose |
|-----------|---------|---------|
| Express.js | 4.19 | HTTP framework |
| better-sqlite3 | 11.8 | SQLite driver (dev) |
| pg | 8.11 | PostgreSQL driver (prod) |
| jsonwebtoken | 9.0 | JWT auth |
| bcryptjs | 3.0 | Password hashing |
| zod | 3.22 | Input validation |
| helmet | 7.1 | Security headers |
| express-rate-limit | 7.2 | Rate limiting |
| morgan | 1.10 | HTTP logging |
| nodemailer / resend | 9.0 / 6.25 | Email service |

### Route Groups (16)
| Group | Prefix | Endpoints | Auth | RBAC |
|-------|--------|-----------|------|------|
| auth | `/api/v1/auth` | 11 | Partial | No |
| questions | `/api/v1/questions` | 12 | Yes | Admin (9) |
| practice | `/api/v1/practice` | 12 | Yes | No |
| daily-challenges | `/api/v1/daily-challenges` | 24 | Yes | Admin (16) |
| submissions | `/api/v1/submissions` | 8 | Yes | Mentor+ (2) |
| progress | `/api/v1/progress` | 3 | Yes | Admin (2) |
| analytics | `/api/v1/analytics` | 2 | Yes | Admin (1) |
| recommendations | `/api/v1/recommendations` | 3 | Yes | No |
| users | `/api/v1/users` | 6 | Yes | Admin (3) |
| code | `/api/v1/code` | 3 | Yes | No |
| notifications | `/api/v1/notifications` | 3 | Yes | No |
| ai-questions | `/api/v1/ai-questions` | 6 | Yes | Admin (6) |
| audit-logs | `/api/v1/admin/audit-logs` | 1 | Yes | Admin |
| dsa-ai | `/api/v1/dsa-ai` | 4 | Yes | No |
| assignments | `/api/v1/assignments` | All | — | 410 REMOVED |
| cohorts | `/api/v1/cohorts` | All | — | 410 REMOVED |

### Middleware (5)
1. `auth.js` — JWT + Supabase token verification, auto-provisioning, admin promotion
2. `rbac.js` — Role-based access control (`requireRole(...)`)
3. `rateLimiter.js` — 4 limiters (auth: 500/15min, execution: 30/min, submission: 20/min, AI: 10/min)
4. `errorHandler.js` — Centralized error formatting with `AppError` class
5. `validator.js` — Zod schema validation for body/query

### Services (45 total)
| Category | Services | Count |
|----------|----------|-------|
| AI/LLM | aiQuestionGenerationPipeline, aiQuestionService, aiDailyChallengeService, aiDailyChallengeAuthoringService, aiSharedGenerationService, aiReviewService | 6 |
| AI Coaching | dsaAiService, dsaAiCoachService, dsaIntentDetectorService, dsaKnowledgeGraphService, dsaProblemMatcherService, dsaAiCacheService, dsaAiObservabilityService | 7 |
| LLM Providers | llm/llmRouter, llm/baseProvider, llm/geminiProvider, llm/groqProvider, llm/openAICompatibleProvider, llm/mockProvider | 6 |
| Embeddings | embeddingService, questionEmbeddingService, questionNoveltyService, questionSimilarityService | 4 |
| Daily Challenge | dailyChallengeService, dailyChallengeAutomationService | 2 |
| Question Bank | questionService, questionBankAutomationService, questionLifecycleService | 3 |
| Practice | practiceService | 1 |
| Submissions | submissionService, scoringService | 2 |
| Code Execution | executionService | 1 |
| Gamification | gamificationService, streakService, leaderboardService | 3 |
| Progress | progressService, recommendationService | 2 |
| Topics | topicService | 1 |
| Notifications | notificationService | 1 |
| Email | emailService | 1 |
| Audit | auditService | 1 |
| Fallback | fallbackTemplates | 1 |

---

## 5. Database Audit

### Tables (30 total)

| # | Table | Purpose |
|---|-------|---------|
| 1 | roles | Role definitions (admin, user, mentor) |
| 2 | users | User accounts with gamification fields |
| 3 | auth_tokens | JWT/OTP/reset tokens |
| 4 | user_daily_activity | Daily login/activity tracking |
| 5 | topics | DSA topic taxonomy |
| 6 | patterns | Algorithmic pattern taxonomy |
| 7 | questions | Unified question corpus (practice + DC + QB) |
| 8 | test_cases | Test cases for questions |
| 9 | submissions | User submission records |
| 10 | code_submissions_log | Code execution audit log |
| 11 | notifications | In-app notifications |
| 12 | badges | Badge definitions |
| 13 | user_badges | User badge awards |
| 14 | points_ledger | Points audit trail |
| 15 | question_embeddings | Vector embeddings for RAG |
| 16 | question_versions | Question version history |
| 17 | daily_challenge_metadata | DC scheduling/lifecycle |
| 18 | daily_challenge_automation_settings | DC automation config |
| 19 | daily_challenge_automation_logs | DC automation audit |
| 20 | question_bank_automation_settings | QB automation config |
| 21 | question_bank_automation_logs | QB automation audit |
| 22 | admin_audit_logs | Admin action audit |
| 23 | assignments | Question assignments (REMOVED — returns 410) |
| 24 | cohorts | Student cohorts (REMOVED — returns 410) |
| 25 | cohort_members | Cohort membership (REMOVED) |
| 26 | live_sessions | Live session records (REMOVED) |
| 27 | practice_progress | Student practice progress |
| 28 | submission_score_audit | Score change audit |
| 29 | dsa_ai_logs | AI operation logs (PG only) |
| 30 | daily_questions | Daily question mapping (PG only, legacy) |

### Schema Notes
- **Unified Question Model:** All questions (practice, DC, QB) live in the same `questions` table
- **Daily Challenge:** Metadata stored in `daily_challenge_metadata` (1:1 with questions)
- **SQLite vs PG differences:** Some columns have different defaults/types; PG has additional indexes
- **RLS enabled** on all PG tables with no permissive policies (deny-by-default)

---

## 6. Student Audit

### Features Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | Implemented | Marketing page with CTA |
| Sign Up | Implemented | Email/password + OTP verification |
| Sign In | Implemented | Email/password + Google OAuth |
| Dashboard | Implemented | Stats overview, streak, recent activity |
| Practice | Implemented | Full problem bank with filtering |
| Problem Workspace | Implemented | Code editor + test runner |
| Code Execution | Implemented | 6 languages via Docker sandbox |
| Daily Challenge | Implemented | One per day, IST-based scheduling |
| Expired DC → Practice | Implemented | Expired DCs move to practice |
| AI Coach | Implemented | 7 action types, progressive hints |
| Submission History | Implemented | Per-question history |
| Analytics | Implemented | Personal progress charts |
| Leaderboard | Implemented | Daily Challenge points only |
| Profile | Implemented | Editable profile fields |
| Notifications | Implemented | In-app notification system |
| Theme Toggle | Implemented | Light/dark mode |

### Student Routes
| Route | Page | Auth |
|-------|------|------|
| `/` | Landing Page | No |
| `/login` | Login | No |
| `/signup` | Signup | No |
| `/forgot-password` | Forgot Password | No |
| `/reset-password/:token` | Reset Password | No |
| `/verify-email/:token` | Verify Email | No |
| `/dashboard` | Student Dashboard | Yes |
| `/practice` | Available Challenges | Yes |
| `/daily` | Daily Challenge | Yes |
| `/solve/:id` | Problem Workspace | Yes |
| `/submissions` | Submission History | Yes |
| `/analytics` | Student Analytics | Yes |
| `/profile` | User Profile | Yes |
| `/notifications` | Notifications | Yes |
| `/leaderboard` | Leaderboard | Yes |
| `/ai-coach` | AI Coach Panel | Yes |

---

## 7. Admin Audit

### Features Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Admin Dashboard | Implemented | System stats, recent activity |
| Question Management | Implemented | CRUD with AI assist |
| AI Question Generation | Implemented | Full pipeline with validation |
| Question Bank Automation | Implemented | Auto-generate every 2 hours |
| Daily Challenge Management | Implemented | Full lifecycle |
| DC AI Assist | Implemented | Generate DC via AI |
| DC Auto Fill | Implemented | Scheduled 00:30 IST |
| Manual "Run Auto-Fill Now" | Implemented | Admin-triggered generation |
| DC Schedule/Publish/Expire | Implemented | Full status transitions |
| DC from Practice | Implemented | Promote practice to DC |
| User Management | Implemented | List, view, role update |
| Progress View | Implemented | Admin aggregate progress |
| Submissions Review | Implemented | Manual + AI review |
| Audit Logs | Implemented | Admin action logging |
| Settings | Implemented | Automation config |

### Admin Routes
| Route | Page | Notes |
|-------|------|-------|
| `/admin-dashboard` | Admin Dashboard | System overview |
| `/admin-challenges` | Question Bank | CRUD + automation |
| `/admin-daily` | Daily Challenge | Full lifecycle management |
| `/admin-users` | User Management | List, view, roles |
| `/admin-progress` | Progress | Aggregate stats |
| `/admin-submissions` | Submissions | All submissions |
| `/admin-reviews` | Review Console | Manual + AI review |
| `/admin-audit` | Audit Logs | Admin action history |
| `/admin-settings` | Settings | Automation config |

---

## 8. AI/LLM Audit

### LLM Provider Chain
1. Groq (GPT-OSS 120B) — `GROQ_API_KEY_1`
2. Gemini (3.1 Flash-Lite) — `GEMINI_API_KEY_1`
3. Groq (GPT-OSS 120B) — `GROQ_API_KEY_2`
4. Gemini (3.5 Flash-Lite) — `GEMINI_API_KEY_2`
5. Groq (GPT-OSS 120B) — `GROQ_API_KEY_3`

### Generation Pipeline
```
Pre-LLM RAG → LLM Generation → Schema Validation → Starter Code Validation
→ Duplicate Check (3 layers) → Embedding Novelty Check → Final Assembly
```

### Duplicate Detection (3 Layers)
1. Clean base title comparison
2. Problem concept + algorithmic signature match
3. Semantic Jaccard/Overlap similarity (threshold: overlap≥0.70 OR jaccard≥0.50)

### Embedding System
- Provider: Gemini `gemini-embedding-001` (3072 dims) with fallback
- Storage: `question_embeddings` table
- Novelty thresholds: DUPLICATE≥0.88, BORDERLINE≥0.75, NOVEL<0.75

### AI Coach
- 7 action types: HINT, APPROACH, EXPLAIN, SOLUTION, COMPLEXITY, DEBUG, CODE_REVIEW
- Deterministic-first: DB hints/solutions served without LLM
- Self-correction loop: sandbox feedback → LLM retry (max 2)

---

## 9. Daily Challenge Audit

### Lifecycle
```
Draft → Scheduled → Published → Archived
```

### Automation
- **00:30 IST Scheduler:** Publishes today's DC, generates tomorrow's
- **Admin "Run Auto-Fill Now":** Checks if tomorrow scheduled → generates NEW (draft or scheduled)
- **IST Boundary:** 00:30 IST daily shift

### Decision Matrix (Admin Auto-Fill)
| Tomorrow Scheduled | Result |
|-------------------|--------|
| YES | Generate NEW → DRAFT (existing untouched) |
| NO | Generate NEW → Index → SCHEDULED |

### Timezone
- All dates use `Asia/Kolkata` via `dateUtils.js`
- `getCanonicalIstDate()` with -30min boundary shift
- `getNextCanonicalIstDate()` for tomorrow calculation

---

## 10. Question Bank Audit

### Architecture
- Same `questions` table as Daily Challenge (unified model)
- Separate automation: `questionBankAutomationService`
- Generates 1 question every 2 hours (12 slots/day)

### Automation Modes
| Mode | Behavior |
|------|----------|
| `auto_fill` | Generate → index → auto-publish |
| `ai_assist` | Generate → index → draft (admin reviews) |

---

## 11. Code Execution Audit

### Docker Runner
- **Base:** `node:22-bookworm-slim`
- **Languages:** JavaScript (Node), Python 3, Java 17, TypeScript, C (gcc), C++ (g++)
- **Security:** Non-root user, read-only fs, 256MB RAM limit, 64 PIDs
- **Timeouts:** 5s execution, 10s compilation
- **Limits:** 100KB code, 20KB input/test, 64KB output, 20 test cases

---

## 12. Security Audit

### Implemented
| Mechanism | Status | Notes |
|-----------|--------|-------|
| JWT Authentication | Implemented | 30-day expiry |
| Supabase OAuth | Implemented | Google PKCE |
| RBAC | Implemented | admin/user/mentor roles |
| Rate Limiting | Implemented | 4 limiters |
| Helmet Headers | Implemented | Default config |
| CORS Allowlist | Implemented | localhost + production domain |
| Input Validation (Zod) | Implemented | Body + query |
| Password Hashing (bcrypt) | Implemented | 10 rounds |
| SQL Injection Prevention | Implemented | Parameterized queries |
| Audit Logging | Implemented | Admin actions |

### Known Security Issues
| Severity | Issue |
|----------|-------|
| CRITICAL | Hardcoded JWT secret fallback in non-production |
| HIGH | No CSRF protection |
| HIGH | CORS allows requests with no Origin header |
| HIGH | In-memory rate limiting (resets on restart) |
| HIGH | Silent admin promotion on every request |
| HIGH | No env validation on startup |
| MEDIUM | No token revocation mechanism |
| MEDIUM | Audit logging is opt-in (not middleware-enforced) |
| MEDIUM | Rate limiter ineffective behind shared proxy |

---

## 13. Testing Audit

### Backend Tests (36 files, ~280 tests)
| Category | Files | Coverage |
|----------|-------|----------|
| Daily Challenge | 7 | DC lifecycle, automation, settings, architecture, AI |
| AI Pipeline | 5 | Generation, validation, determinism, strictness |
| AI Coach | 6 | Coach v1/v2, input clearing, validation, foundation, router |
| Auth | 3 | Auth flow, JWT, RLS |
| Practice | 3 | Practice v1, integrity, execution |
| Code Execution | 1 | Execution service |
| Submissions/Scoring | 3 | Scoring, admin stats, leaderboard isolation |
| Questions/Novelty | 3 | Novelty, integration, embedding |
| Notifications | 1 | Notification service |
| Other | 4 | Phase4 comprehensive, streak separation, lifecycle |

### Playwright E2E (9 specs)
| Spec | Coverage |
|------|----------|
| `daily_challenge_lifecycle.spec.js` | DC full lifecycle + automation |
| `auth.spec.js` | Auth flows |
| `practice.spec.js` | Practice workspace |
| `admin.spec.js` | Admin dashboard |
| `dashboard.spec.js` | Student dashboard |
| `leaderboard.spec.js` | Leaderboard |
| `submissions.spec.js` | Submissions |
| `responsive.spec.js` | Mobile responsiveness |
| `theme.spec.js` | Theme toggling |

---

## 14. CI/CD Audit

### GitHub Actions
- **CI:** Backend tests → Frontend build → Playwright E2E
- **CD:** Heroku deploy → Vercel gate → Production smoke test

### Deployment
- **Backend:** Heroku (Procfile: `cd backend && node src/server.js`)
- **Frontend:** Vercel (SPA rewrite rule)
- **Release Phase:** `npm run migrate:postgres` before deploy

### Docker
- Code runner only (not the main app)
- `docker-compose.yml` with security hardening

---

## 15. Known Issues

### Critical
1. Hardcoded JWT secret fallback — dangerous if NODE_ENV misconfigured
2. No CSRF protection on cookie-based auth flows

### High
3. CORS allows all requests with no Origin header
4. In-memory rate limiting — useless in multi-instance deployments
5. Silent admin promotion without audit trail
6. No environment variable validation on startup
7. Email service `sentMailLog` unbounded memory leak

### Medium
8. N+1 queries in `refreshCompetitiveRanks()` and `getAdminAggregateProgress()`
9. `StudentSidebar`/`AdminSidebar` no mobile overlay support
10. Vite config monkey-patches source files at build time
11. `vite.config.js` uses `dailyChallengeAiAuthoringPlugin` that patches files — fragile

### Low
12. `test:frontend` script runs build, not tests
13. No structured logging (JSON) in production
14. No token revocation/blacklist mechanism

---

## 16. Technical Debt

1. **Legacy Layouts:** `StudentLayout` and `AdminLayout` appear unused (MainLayout is primary)
2. **Dual Sidebar Components:** `Sidebar.jsx` vs `StudentSidebar.jsx`/`AdminSidebar.jsx` — inconsistent mobile support
3. **Legacy Tables:** `daily_questions`, `daily_challenge_problems` (dropped in migration 022) — some references remain
4. **Migration Conflicts:** Duplicate migration numbers (011, 012) with different content
5. **Scratch Files:** 12+ scratch/utility scripts in backend root (not cleaned up)
6. **Unused Services:** `questionSimilarityService.js` (legacy, not used by main pipeline)
7. **SQLite/PG Divergence:** Schema has subtle differences in defaults and column types

---

## 17. Final Audit Status

| Area | Status |
|------|--------|
| Frontend | Implemented — 30 pages, 23 components, theme system |
| Backend | Implemented — 100+ endpoints, 45 services |
| Database | Implemented — 30 tables, 25 migrations |
| AI System | Implemented — 5-provider router, RAG, novelty |
| Code Execution | Implemented — 6 languages, Docker sandbox |
| Auth/Security | Implemented — JWT + Supabase, RBAC, rate limiting |
| Daily Challenge | Implemented — Full lifecycle, IST timezone |
| Question Bank | Implemented — Unified model, auto-generation |
| Practice | Implemented — Full problem bank, progress tracking |
| Gamification | Implemented — Points, streaks, badges, leaderboard |
| Testing | Implemented — 280+ backend tests, 9 E2E specs |
| CI/CD | Implemented — GitHub Actions, Heroku, Vercel |
| Documentation | Partial — 4 existing docs, audit report being added |
