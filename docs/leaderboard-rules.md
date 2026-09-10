# Leaderboard & Scoring Rules

Axly DSA Tracker maintains a strict separation between **personal practice progression** and **competitive leaderboard rankings**. This isolation ensures that students can practice at their own pace without inflating the daily competitive leaderboard.

## The Two-Point System

| Point Type | Source | Purpose |
|------------|--------|---------|
| **Practice Points** | Solving questions in the Practice Library | Personal gamification, progress tracking, and skill mastery metrics. |
| **Daily Challenge Points** | Solving the active Daily Challenge | Competitive ranking, global leaderboard placement, and streaks. |

### 1. Leaderboard Ranking Logic

The global competitive leaderboard is ordered **strictly by Daily Challenge performance**. Practice points have zero impact on a user's competitive rank.

**All-Time Ranking Sort Order:**
1. **Daily Challenge Points** (Descending)
2. **Daily Challenge Streak** (Descending)
3. **Daily Challenge Best Streak** (Descending)
4. **User Name** (Ascending / Alphabetical tiebreaker)
5. **User ID** (Stable secondary tiebreaker)

**Weekly / Monthly Ranking Sort Order:**
1. **Period Daily Challenge Points** (Descending - points earned in the last 7 or 30 days)
2. **Period Solved Count** (Descending - number of challenges solved in the period)
3. **User Name** (Ascending)
4. **User ID** (Ascending)

### 2. Daily Challenge Scoring (Deterministic)

When a student submits a solution to the active Daily Challenge, the code execution service assigns a score out of 100 maximum points. The breakdown is strictly deterministic:

- **Test Performance (max 60 pts):** Based on the percentage of test cases passed (e.g., 50% passing = 30 pts).
- **Time Performance (max 20 pts):** Awarded if the execution time is below the optimal threshold (typically derived from the reference solution).
- **Attempt Efficiency (max 20 pts):** Awarded for solving the challenge in fewer attempts. Maximum points for 1 attempt, decaying with subsequent attempts.

**Late Submissions:** 
Submitting a Daily Challenge after its active UTC day has passed will award completion points to the user's total, but will *not* increment their active daily streak.

### 3. Practice Scoring

Practice submissions are evaluated against test cases but are only awarded personal `practice_points`.
- They do not increment the `daily_challenge_points`.
- They do not affect the `leaderboard_score`.
- They are visible only to the student and administrators/mentors in the progress analytics dashboards.

### 4. Admin Controls & Refresh

- Ranks are dynamically calculated. The `refreshCompetitiveRanks` service runs periodically or on-demand to update the materialized `rank` integer on the `users` table based on the absolute sorting logic.
- Administrators can view detailed progress (combining both practice and daily challenge scores) through the `/api/v1/progress/admin` routes.
