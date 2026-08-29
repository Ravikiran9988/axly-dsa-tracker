# Axly Product Rules

## Daily Challenge
- One global Daily Challenge is selected per UTC calendar day.
- The challenge is the same for all students.
- A student who starts before midnight UTC may continue after midnight; the submission remains tied to the challenge they started and does not receive points for the new day.
- Correct Daily Challenge completion awards 100 competitive points once per challenge.
- All-time leaderboard ordering: competitive points descending, then streak descending, then longest streak descending, then name ascending, then id ascending.
- Daily streak increments only after a successful/correct Daily Challenge submission. Opening a challenge or practicing does not maintain the Daily Challenge streak.

## Practice
- Students freely choose problems from the Practice bank; admins do not need to assign individual practice problems.
- Starting a Practice problem places it in the student's Progress as In Progress.
- Practice has no competitive points and does not affect the competitive leaderboard.
- Practice activity remains available for personal progress, analytics, history, AI review, and recommendations.
- Students can explicitly Abandon an unfinished practice problem; it becomes skipped and is not marked solved.

## AI Question Generation
- AI-generated questions must pass normal admin review before publishing.
- Generated questions are checked against existing published questions using embedding cosine similarity when embeddings are configured.
- Initial similarity threshold is 0.85. A match is a review flag, not an automatic rejection.

## Code Execution
- Submitted code is untrusted input and must execute in an isolated sandbox.
- Production execution must enforce language allowlisting, CPU/time limits, memory limits, output/input limits, process cleanup, concurrency/rate limits, and no unrestricted network access or access to application secrets.

## Submissions and Problems
- Meaningful submissions retain their start timestamp so Daily Challenge scoring can remain tied to the challenge start date across a UTC midnight boundary.
- Every meaningful submission must be associated with the problem version/test-case snapshot used for evaluation.
- Published problem edits create a new version; old submissions are never retroactively regraded against changed test cases.
- Resubmissions should support a code diff so students can see changes after AI feedback.

## Period Leaderboards
- Weekly/monthly scores use only qualifying Daily Challenge points earned inside the selected UTC period.
- Period boards do not use all-time streak or longest streak as tiebreakers.
- Ordering: period points descending, then most-recent successful submission ascending, then id ascending.
- Period score calculation may be period-specific, but ordering must flow through the shared leaderboard service.

## Data Storage
- The application implements a dual repository architecture (`repositoryFactory.js`):
  - Production uses PostgreSQL / Supabase with Row-Level Security (RLS) policies.
  - Development and automated test runs use SQLite (`better-sqlite3`) for zero-dependency execution.
- In production, PostgreSQL connectivity is verified on boot and the service fails fast if the database is unreachable.

## Notifications
- Default student notifications are limited to Daily Challenge reminders and AI review availability.
- Achievement and other non-critical notifications should be opt-in.
