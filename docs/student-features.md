# Axly DSA Tracker — Student Features

## Overview

Student features are accessible after login via `/student/*` routes. The student dashboard is the main hub for problem-solving, tracking progress, and engaging with Daily Challenges.

---

## Navigation

### Sidebar Items
| Route | Label | Description |
|-------|-------|-------------|
| `/student/dashboard` | Dashboard | Stats overview |
| `/student/practice` | Practice | Problem bank |
| `/student/daily-challenge` | Daily Challenge | Today's challenge |
| `/student/submissions` | Submissions | Submission history |
| `/student/analytics` | Analytics | Progress charts |
| `/student/leaderboard` | Leaderboard | Rankings |
| `/student/achievements` | Achievements | Badges |
| `/student/coach` | DSA Coach | AI tutor |

### Top Navigation (Navbar)
- Logo → `/student/dashboard`
- Daily Challenge badge (when active)
- Notifications bell
- Theme toggle
- Profile dropdown
- Sidebar collapse button

---

## Dashboard (`/student/dashboard`)

### Stats Cards
| Metric | Description |
|--------|-------------|
| Total Solved | Questions completed |
| Practice Points | Points from practice |
| DC Points | Points from Daily Challenge |
| Best Streak | Longest consecutive days |
| Current Streak | Active streak count |

### Charts
- **Topic Progress:** Doughnut chart by topic
- **Difficulty Distribution:** Bar chart (Easy/Medium/Hard)
- **Activity Timeline:** Line chart of daily solves

### Quick Actions
- Start Practice → `/student/practice`
- Start Daily Challenge → `/student/daily-challenge`
- View Leaderboard → `/student/leaderboard`

---

## Practice Mode (`/student/practice`)

### Problem List
- **Filters:** Topic, difficulty, status (solved/unsolved/in-progress)
- **Sort:** Title, difficulty, topic
- **Display:** Table with status badges

### Problem Card
| Field | Description |
|-------|-------------|
| Title | Problem name |
| Difficulty | Easy/Medium/Hard badge |
| Topic | Main topic tag |
| Status | Solved/Unsolved/In-Progress |
| Points | Reward points |

### Problem Workspace (`/student/practice/:problemSlug`)
- **Left Panel:** Problem description, examples, hints
- **Right Panel:** Code editor + test output
- **Bottom:** Submit button, hints, AI Coach

### Code Editor
- Languages: JS, Python, Java, C, C++, TypeScript
- Auto-save (localStorage)
- Syntax highlighting
- Auto-driver injection (JS/Python)

### Execution
- Run against visible test cases
- Results displayed immediately
- Custom input support

### Submission
- Runs against hidden test cases
- Score calculated (test performance + time + attempts)
- Points awarded on first solve

---

## Daily Challenge (`/student/daily-challenge`)

### View
- Displays today's published challenge
- 404 if no challenge exists

### Solve
- Same workspace as practice
- One submission per challenge

### Points
| Difficulty | Base | Max with Streak |
|-----------|------|-----------------|
| Easy | 50 | 100 |
| Medium | 100 | 150 |
| Hard | 150 | 200 |

### Streak
- +10 points per consecutive day
- Max +50 bonus
- Resets if day missed

---

## Submissions (`/student/submissions`)

### History
- List of all submissions
- Filter by: question, language, status
- Sort by: date, score

### Submission Detail
- Code submitted
- Test results
- Score breakdown
- Feedback (if reviewed)

---

## Analytics (`/student/analytics`)

### Charts
| Chart | Type | Data |
|-------|------|------|
| Topic Progress | Doughnut | Solved by topic |
| Difficulty | Bar | Easy/Medium/Hard |
| Activity | Line | Daily solves |
| Points | Area | Points over time |
| Streak | Bar | Daily streaks |

### Time Range
- Last 7 days
- Last 30 days
- Last 90 days
- All time

---

## Leaderboard (`/student/leaderboard`)

### Scores
- **DC Score:** `daily_challenge_points` + `daily_challenge_streak_bonus`
- **Practice Score:** `points` (unchanged)
- **Combined:** `leaderboard_score = DC Score + Practice Score`

### Ranking
- Materialized in `users.rank` column
- Updated by `recalcLeaderboardRank` trigger
- Global ranking (all users)

### Display
| Rank | User | DC Points | Practice Points | Total | Streak |
|------|------|-----------|-----------------|-------|--------|
| 1 | ... | ... | ... | ... | ... |

---

## Achievements (`/student/achievements`)

### Badge Categories
| Category | Example Badges |
|----------|----------------|
| Streak | First Solve, 7-Day Streak, 30-Day Streak |
| Points | 100 Points, 500 Points, 1000 Points |
| Problems | First Problem, 10 Problems, 50 Problems |
| Difficulty | Easy Master, Medium Master, Hard Master |
| Daily Challenge | First DC, DC Streak, DC Perfect Week |

### Award Mechanism
- Earned automatically on milestone completion
- One-time award (no duplicates)
- Displayed in profile

---

## AI Coach (`/student/coach`)

### Interface
- Chat panel (85vh)
- Question context auto-loaded
- Input: text, code

### Capabilities
| Intent | Response |
|--------|----------|
| HINT | Progressive hints (DB or LLM) |
| APPROACH | Solution approach |
| EXPLAIN | Problem explanation |
| SOLUTION | Full solution |
| COMPLEXITY | Time/space analysis |
| DEBUG | Debug student code |
| CODE_REVIEW | Code quality review |

### Code Verification
- Submit code for AI review
- Runs in sandbox
- If fails → AI generates corrected code
- Max 2 correction attempts

---

## Profile (`/student/profile`)

### Fields
- Name, email, bio
- Skills, GitHub URL, LinkedIn URL
- Avatar URL

### Edit
- Update any field
- Save changes

### Points Display
- Practice points
- DC points
- Combined score

---

## Theme

### Toggle
- Sun/Moon icon in navbar
- Light/Dark modes
- Persisted in localStorage

### Accessible
- 44px touch targets
- High contrast
- Focus indicators

---

## Responsive Design

### Breakpoints
| Size | Layout |
|------|--------|
| Mobile (<640px) | Stacked, sidebar as overlay |
| Tablet (640-1024px) | Collapsible sidebar |
| Desktop (>1024px) | Fixed sidebar |

### Touch Targets
- Minimum 44px for all interactive elements

---

## Known Student Feature Gaps

1. **No problem bookmarking**
2. **No custom study plans**
3. **No peer collaboration**
4. **No time tracking per problem**
5. **No difficulty preference setting**
6. **No per-cohort leaderboard**
