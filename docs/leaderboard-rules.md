# Leaderboard Rules

## Competitive leaderboard
- All-time competitive board: `points DESC -> streak DESC -> longest_streak DESC -> name ASC -> id ASC`.
- The ordering is centralized in `leaderboardService.js`.

## Weekly and monthly boards
- Period score is calculated only from qualifying Daily Challenge points earned inside the selected UTC period.
- Period boards must not use all-time streak or longest_streak as a tiebreaker.
- Ordering: `period_points DESC -> most_recent_successful_submission ASC -> id ASC`.
- `most_recent_successful_submission` means the earliest timestamp at which the student reached their qualifying successful submission state for the relevant period; it is a deterministic ranking field, not additional score.
- Period leaderboard queries must use the shared leaderboard service for ordering. Score calculation may remain period-specific, but ordering must not be duplicated in controllers/routes.
- If no qualifying period leaderboard query exists yet, this rule is the required implementation contract for it.
