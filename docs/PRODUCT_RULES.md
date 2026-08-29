# Axly DSA Tracker — Product Rules

These are the canonical product and scoring rules. All implementation decisions must conform to this document.

---

## Daily Challenge

- One global Daily Challenge is selected per UTC calendar day.
- The challenge is identical for all students — there is no per-cohort or per-user variant.
- A student who starts a challenge before midnight UTC may continue and submit after midnight. The submission remains tied to the challenge they started and does not receive points for the new day.
- Correct Daily Challenge completion awards competitive points **once per challenge** per user. Resubmissions after the first accepted solution do not increase points.
- The active Daily Challenge is always fetched from `GET /api/v1/daily-challenges/today`. No component may derive or cache the daily challenge independently.
- **Streak rule**: The Daily Challenge streak increments **only** after a successful/correct submission. Opening a challenge, practicing, or using the AI Coach does not maintain or increment the Daily Challenge streak.

### Point Values

| Difficulty | Base Points |
|-----------|-------------|
| Easy | 50 |
| Medium | 100 |
| Hard | 150 |

- **Streak bonus**: +10 pts per consecutive day solved (capped at 5 consecutive days = +50 bonus max).
- Streak bonus is applied at submission time and is not retroactively recalculated.

---

## Practice

- Students freely choose problems from the Practice Bank; admins do not need to assign individual practice problems.
- Starting a Practice problem places it in the student's progress as `in_progress`.
- **Practice problems award 0 competitive points** — this is a hard invariant, not a configuration option.
- Practice activity does not affect the competitive leaderboard, Daily Challenge streak, or daily streak.
- Practice activity is available for personal progress tracking, analytics, AI coaching, and recommendations.
- Students can explicitly `Abandon` an in-progress problem; it becomes `abandoned` and is **not** marked as solved.
- A practice problem is only marked `solved` via an accepted code submission through the sandbox.

---

## DSA AI Coach

- The AI Coach is **read-only** with respect to all scoring systems. It never:
  - Marks a practice problem as solved
  - Awards competitive points
  - Modifies Daily Challenge streaks or leaderboard scores
  - Exposes hidden test case inputs or expected outputs
- The Coach follows a deterministic-first approach: known practice problems are answered from the database (0 LLM tokens). LLM is only called for novel or unmatched queries.
- API keys (`GROQ_API_KEY_*`) must never appear in any API response, frontend bundle, log file, or error message.

---

## Leaderboard Rules

### All-Time Competitive Board

Ordering: `points DESC → streak DESC → longest_streak DESC → name ASC → id ASC`

The ordering is centralized in `leaderboardService.js`. Controllers and routes must not duplicate ordering logic.

### Weekly and Monthly Period Boards

- Period score uses only qualifying Daily Challenge points earned inside the selected UTC period.
- Period boards do not use all-time streak or `longest_streak` as tiebreakers.
- Ordering: `period_points DESC → most_recent_successful_submission ASC → id ASC`
- `most_recent_successful_submission` is the earliest timestamp at which the student reached their qualifying successful submission for the period. It is a deterministic tie-breaking field, not an additional score.
- Period leaderboard queries must use the shared leaderboard service for ordering.

---

## Code Execution

- Submitted code is untrusted input and must execute in an isolated sandbox.
- Sandbox requirements:
  - Language allowlisting (no unrestricted shell access)
  - CPU/time limit: 5,000 ms per test case
  - Output limit: 64 KB per test run
  - Source code size limit: 100 KB
  - Test case limit: 20 per run
  - No unrestricted network access from executed code
  - No access to application secrets or environment variables from executed code
  - Guaranteed temp directory cleanup (finally block)
- Hidden test case inputs and expected outputs must never appear in any API response, regardless of submission outcome.

---

## Questions & Submissions

- Every meaningful submission must be associated with the problem version/test-case snapshot used for evaluation.
- Published question edits create a new version record. Old submissions are **never** retroactively regraded against updated test cases.
- A student who starts a Daily Challenge before midnight UTC and submits after midnight receives points against the challenge they started. The submission timestamp determines the challenge association, not the submission time.
- Resubmissions after a first `solved` state retain the original `solved_at` timestamp and `started_at` timestamp for scoring consistency.

---

## AI Question Generation

- AI-generated questions must pass normal admin review before publishing.
- Generated questions are optionally checked against existing published questions using embedding cosine similarity (threshold: 0.85). A match is a review flag, not an automatic rejection.
- Generated questions are language-independent and use standard I/O (stdin/stdout) for test cases.

---

## Data Storage

- The application implements a dual repository architecture (`repositoryFactory.js`):
  - **Development / Testing**: SQLite via `better-sqlite3`. Zero external dependencies. Auto-created on boot.
  - **Production**: PostgreSQL / Supabase with Row-Level Security (RLS) policies.
- In production, PostgreSQL connectivity is verified on boot via `/health/ready`. The service fails fast if the database is unreachable.
- All database queries use parameterized placeholders (`?` for SQLite, auto-translated to `$N` for PostgreSQL). Raw string interpolation in queries is prohibited.
- All services call `getRepository()` lazily at query time — never at module import time.

---

## Notifications

- Default student notifications are limited to: Daily Challenge reminders and submission accepted/failed events.
- Achievement and non-critical notifications are opt-in.
- Admin actions that affect a student (role change, review feedback) trigger a targeted notification to that student.

---

## Practice Bank V1 — Invariants

- The V1 Practice Bank ships with exactly **80 problems** across 8 topics.
- Topic distribution must be maintained during seed updates:

| Topic | Count |
|-------|-------|
| Arrays | 12 |
| Strings | 10 |
| Hashing | 8 |
| Two Pointers & Sliding Window | 10 |
| Stack | 8 |
| Binary Search | 8 |
| Trees | 12 |
| Dynamic Programming | 12 |
| **Total** | **80** |

- Only the 14 approved algorithmic patterns (see `README.md`) may be used for practice problem tagging.
- New practice problems added in future versions must not break existing test coverage on topic distribution.
