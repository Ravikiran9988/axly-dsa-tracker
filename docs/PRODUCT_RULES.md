# Axly DSA Tracker — Product Rules

These are the canonical product and scoring rules. All implementation decisions must conform to this document.

---

## 1. Daily Challenge [IMPLEMENTED]

- One global Daily Challenge is selected per UTC calendar day.
- The challenge is identical for all students — there is no per-cohort or per-user variant.
- A student who starts a challenge before midnight UTC may continue and submit after midnight. The submission remains tied to the challenge they started.
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

## 2. Practice Bank [IMPLEMENTED]

- Students freely choose problems from the Practice Bank; admins do not need to assign individual practice problems.
- Starting a Practice problem places it in the student's progress as `in_progress`.
- **Practice problems award 0 competitive points** — this is a hard invariant, not a configuration option. Practice points are strictly personal.
- Practice activity does not affect the competitive leaderboard, Daily Challenge streak, or daily streak.
- Practice activity is available for personal progress tracking, analytics, AI coaching, and recommendations.
- Students can explicitly `Abandon` an in-progress problem; it becomes `abandoned` and is **not** marked as solved.
- A practice problem is only marked `solved` via an accepted code submission through the sandbox.

---

## 3. DSA AI Coach [IMPLEMENTED]

- The AI Coach is **read-only** with respect to all scoring systems. It never:
  - Marks a practice problem as solved
  - Awards competitive points
  - Modifies Daily Challenge streaks or leaderboard scores
  - Exposes hidden test case inputs or expected outputs
- The Coach follows a deterministic-first approach: known practice problems are answered from the database (0 LLM tokens). LLM is only called for novel or unmatched queries.
- API keys (`GROQ_API_KEY_*`) must never appear in any API response, frontend bundle, log file, or error message.

---

## 4. Leaderboard Rules [IMPLEMENTED]

### All-Time Competitive Board

Ordering: `points DESC → streak DESC → longest_streak DESC → name ASC → id ASC`

The ordering is centralized in `leaderboardService.js`. Controllers and routes must not duplicate ordering logic.

### Weekly and Monthly Period Boards

- Period score uses only qualifying Daily Challenge points earned inside the selected UTC period.
- Period boards do not use all-time streak or `longest_streak` as tiebreakers.
- Ordering: `period_points DESC → completed_count DESC → name ASC → id ASC`
- Period leaderboard queries must use the shared leaderboard service for ordering.

---

## 5. Code Execution [IMPLEMENTED]

- Submitted code is untrusted input and must execute in an isolated sandbox.
- Sandbox requirements:
  - Language allowlisting (no unrestricted shell access)
  - CPU/time limit: 5,000 ms per test case
  - Output limit: 64 KB per test run
  - Source code size limit: 100 KB
  - Test case limit: 20 per run
  - No unrestricted network access from executed code
  - No access to application secrets or environment variables from executed code
  - Guaranteed temp directory cleanup
- Hidden test case inputs and expected outputs must never appear in any API response.

---

## 6. AI Question Generation [PLANNED / PARTIALLY IMPLEMENTED]

- *Implemented:* Admin endpoints exist to use LLMs to generate question markdown and base test cases.
- *Implemented:* Generated questions require admin review before publishing to the Practice Bank or Daily Challenge pool.
- *Planned:* Vector embeddings to check cosine similarity against existing questions to prevent duplicates automatically.

---

## 7. Cohorts & Assignments [DEPRECATED]

- The platform previously explored instructor-led "Cohorts" and individual "Assignments". 
- These features have been removed from the product scope in favor of the global **Daily Challenge** and self-paced **Practice** workflows. 
- Legacy endpoints return HTTP `410 Gone`.

---

## 8. Data Storage & Architecture [IMPLEMENTED]

- The application implements a dual repository architecture (`repositoryFactory.js`):
  - **Development / Testing**: SQLite via `better-sqlite3`. Zero external dependencies. Auto-created on boot.
  - **Production**: PostgreSQL.
- In production, PostgreSQL connectivity is verified on boot via `/health/ready`. The service fails fast if the database is unreachable.
- All database queries use parameterized placeholders (`?` for SQLite, auto-translated to `$N` for PostgreSQL). Raw string interpolation in queries is prohibited.
- All services call `getRepository()` lazily at query time — never at module import time.
