# Axly Product Rules

## Daily Challenge
- One global Daily Challenge is selected per UTC calendar day.
- The challenge is the same for all students.
- A student who starts before midnight UTC may continue after midnight; the submission remains tied to the challenge they started and does not receive points for the new day.
- Correct Daily Challenge completion awards 100 competitive points once per challenge.
- Leaderboard ordering: competitive points descending, then streak descending, then longest streak descending, then name ascending.
- Daily streak increments only after a successful/correct Daily Challenge submission. Opening a challenge or practicing does not maintain the Daily Challenge streak.

## Practice
- Students freely choose problems from the Practice bank; admins do not need to assign individual practice problems.
- Starting a Practice problem places it in the student's Progress as In Progress.
- Practice has no competitive points and does not affect the competitive leaderboard.
- Practice activity remains available for personal progress, analytics, history, AI review, and recommendations.
- Students should have an explicit Abandon action to remove a started practice problem from In Progress without marking it solved.

## AI Question Generation
- AI-generated questions must pass normal admin review before publishing.
- A duplicate/near-duplicate similarity check should flag high similarity (initial threshold: 0.85) against existing published questions. The flag is a review signal, not an automatic rejection.

## Code Execution
- Submitted code is untrusted input and must execute in an isolated sandbox.
- Production execution must enforce language allowlisting, CPU/time limits, memory limits, output/input limits, process cleanup, concurrency/rate limits, and no unrestricted network access or access to application secrets.

## Submissions and Problems
- Every meaningful submission remains associated with the problem version/test-case snapshot used for evaluation.
- Published problem edits create a new version; old submissions are never retroactively regraded against changed test cases.
- Resubmissions should support a code diff so students can see changes after AI feedback.

## Notifications
- Default student notifications are limited to Daily Challenge reminders and AI review availability.
- Achievement and other non-critical notifications should be opt-in.
