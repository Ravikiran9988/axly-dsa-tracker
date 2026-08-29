# Axly DSA Tracker — API Reference

> **Base URL:** `/api/v1`
> **Auth Header:** `Authorization: Bearer <jwt>`
> **Content-Type:** `application/json`

All successful responses: `{ "data": { ... } }`
All error responses: `{ "error": { "code": "ERROR_CODE", "message": "..." } }`

---

## 1. Authentication — `/api/v1/auth`

### `POST /auth/login`
Authenticate and receive a JWT.
```json
// Request
{ "email": "alex@example.com", "password": "secret" }

// Response 200
{ "token": "eyJhbGci...", "user": { "id": "usr-alex", "name": "Alex", "role": "user" } }
```

### `POST /auth/verify`
Re-validate session token and return the resolved user profile.
Auth: Bearer required.

### `POST /auth/signup`
Register a new student. Request: `{ name, email, password }`. Response 201: `{ token, user }`.

### `POST /auth/forgot-password` / `POST /auth/reset-password`
Initiate and complete password reset via email token.

### `POST /auth/logout`
Auth: Required. Response 200: `{ "message": "Logged out successfully" }`.

---

## 2. Practice Problem Bank — `/api/v1/practice`

### `GET /practice/problems`
Browse the 80-problem practice bank with multi-dimensional filtering.

| Query Param | Values |
|-------------|--------|
| `topic` | `arrays`, `strings`, `hashing`, `two-pointers-sliding-window`, `stack`, `binary-search`, `trees`, `dynamic-programming` |
| `pattern` | e.g. `two-pointers`, `sliding-window`, `hash-map-lookup`, `1d-dp` |
| `difficulty` | `easy` \| `medium` \| `hard` |
| `status` | `not_started` \| `in_progress` \| `solved` \| `abandoned` |
| `search` | Free-text |
| `page` / `limit` | Default: 1 / 20; max limit: 100 |

### `GET /practice/problems/:id` (alias: `GET /practice/:id`)
Full problem specification, public test cases, hints, starter code for all 6 languages.
Auth: Required.

### `POST /practice/problems/:id/start`
Transitions status to `in_progress`, records start timestamp.
Auth: Required.

### `POST /practice/problems/:id/abandon`
Marks problem as `abandoned`.
Auth: Required.

### `POST /practice/problems/:id/submission`
Records a practice attempt. **Awards 0 competitive points** (invariant).
Auth: Required.
```json
// Request
{ "status": "solved", "code": "...", "language": "javascript" }
```

### `GET /practice/progress`
Personal progress summary.
```json
// Response 200
{
  "data": {
    "problems_solved": 12, "problems_total": 80,
    "easy_solved": 5, "easy_total": 28,
    "medium_solved": 6, "medium_total": 36,
    "hard_solved": 1, "hard_total": 16,
    "topic_breakdown": [{ "topic": "arrays", "solved": 4, "total": 12 }]
  }
}
```

### `GET /practice/topics`
All 8 core topics with problem counts.

### `GET /practice/patterns`
All 14 approved algorithmic patterns.

---

## 3. Code Execution — `/api/v1/code`

### `POST /code/run`
Execute code against public test cases or custom stdin. Does not update progress.

Auth: Required. Rate limit: 30 req/min.
Supported languages: `javascript`, `python`, `typescript`, `java`, `cpp`, `c`
```json
// Request
{
  "question_id": "arr-001",
  "language": "javascript",
  "source_code": "const fs = require('fs');\n...",
  "custom_input": "optional stdin"
}

// Response 200
{
  "data": {
    "status": "Accepted",
    "passed_tests": 2, "total_tests": 2,
    "execution_time_ms": 42,
    "results": [
      { "test_index": 1, "status": "Accepted", "input": "...", "expected_output": "...", "actual_output": "..." }
    ]
  }
}
```

Status values: `Accepted` | `Wrong Answer` | `Runtime Error` | `Time Limit Exceeded` | `Compilation Error` | `Output Limit Exceeded`

### `POST /code/submit`
Submit against ALL test cases (including hidden). Updates practice/challenge progress.

Auth: Required. Rate limit: 15 req/min.
```json
// Request
{ "question_id": "arr-001", "language": "javascript", "source_code": "..." }
```
Response includes: full test results, submission status, points awarded (Daily Challenge only), and scoring breakdown.

### `GET /code/submissions/:question_id`
Past code submissions for the authenticated user on the given problem (last 50).

---

## 4. Daily Challenge — `/api/v1/daily-challenges`

### `GET /daily-challenges/today` ← SINGLE SOURCE OF TRUTH
Returns today's active Daily Challenge. **Both Dashboard and Daily Challenge page must use this endpoint.**

Auth: Required.
```json
// Response 200
{
  "data": {
    "id": "dc-20260829",
    "title": "Maximum Subarray",
    "difficulty": "Medium",
    "points": 100,
    "date": "2026-08-29",
    "topic_name": "Arrays",
    "pattern_name": "Kadane's Algorithm",
    "description": "Given an integer array...",
    "submission_status": "not_started",
    "dailyChallengeStreak": 3
  }
}
```

### `GET /daily-challenges`
List all challenges. Query: `status`, `difficulty`, `date`, `page`, `limit`. Auth: Required.

### `GET /daily-challenges/:id`
Single challenge by ID.

### `POST /daily-challenges` — Admin only
Create a new Daily Challenge.

### `PUT /daily-challenges/:id` — Admin only
Update challenge metadata.

### `POST /daily-challenges/:id/schedule` — Admin only
Schedule for a specific UTC date.

### `POST /daily-challenges/:id/publish` / `unpublish` / `archive` — Admin only
Lifecycle state transitions.

### `POST /daily-challenges/generate-ai` — Admin only
Generate challenge spec via LLM.

### `POST /daily-challenges/from-practice` — Admin only
Promote a practice problem to a Daily Challenge.

---

## 5. Question Bank — `/api/v1/questions`

### `GET /questions`
Paginated list. Query: `difficulty`, `topic_id`, `search`, `page`, `limit`.

### `GET /questions/:id`
Full question record with test cases and version info.

### `POST /questions` — Admin only
Create a question. Schema: `{ title, difficulty, topic_id, description, constraints, hints, starter_code, test_cases }`.

### `PATCH /questions/:id` — Admin only
Update question. Creates an audited version record automatically.

### `DELETE /questions/:id` — Admin only
Soft-delete (archive). Returns `409` if question is today's active Daily Challenge.

### `GET /questions/:id/versions`
Version history for a question.

### `POST /questions/:id/versions/:version/restore` — Admin only
Restore a previous version.

---

## 6. DSA AI Coach — `/api/v1/dsa-ai`

### `POST /dsa-ai/coach`
Main coach endpoint. Supports all 9 actions with deterministic-first + LLM fallback.

Auth: Required. Rate limit: 100 req/15min.

| Field | Required | Description |
|-------|----------|-------------|
| `question` | ✅ | User query text |
| `problemId` | Optional | Practice problem ID for context grounding |
| `action` | Optional | `HINT`, `EXPLAIN`, `APPROACH`, `SOLUTION`, `COMPLEXITY`, `CODE_REVIEW`, `DEBUG`, `TEST_CASE`, `CONCEPT` |
| `language` | Optional | Default: `javascript` |
| `code` | Optional | Student code for review or debug |
| `hintIndex` | Optional | Progressive hint level (0, 1, 2, ...) |
| `verify` | Optional | `true` runs sandbox verification on generated solution |

```json
// Request
{
  "question": "How do I approach Two Sum?",
  "problemId": "q-two-sum",
  "action": "HINT",
  "language": "javascript",
  "hintIndex": 0
}

// Response 200
{
  "data": {
    "intent": "HINT",
    "source": "database",
    "topic": "Arrays",
    "pattern": "Hash Map Lookup",
    "answer": "Hint 1 of 2: Use a hash table to check for target complements in O(1) time.",
    "code": null,
    "complexity": { "time": "O(N)", "space": "O(N)" },
    "verification": null
  }
}
```

`source` values: `database` (0 LLM tokens) | `llm` (Groq) | `fallback` (all providers down)

### `POST /dsa-ai/analyze`
Phase 1 deterministic analysis. No LLM call.
Request: `{ question, problemId }`.
Response: `{ intent, matchedProblem, topic, pattern, context }`.

### `POST /dsa-ai/generate`
Phase 2 LLM-backed guidance with Groq multi-key failover.
Request: `{ question, problemId, code }`.

### `POST /dsa-ai/verify`
Sandbox code verification with bounded self-correction (max 2 attempts).
Request: `{ problemId, language, code }`.
```json
// Response 200
{
  "data": {
    "verified": true,
    "status": "Accepted",
    "passed_tests": 5,
    "total_tests": 5,
    "execution_time_ms": 43,
    "correctionsMade": 0
  }
}
```

---

## 7. Users & Leaderboard — `/api/v1/users`

### `GET /users/leaderboard`
Auth: Required. Query: `period` = `all` | `weekly` | `monthly`.

Ordering (all-time): `points DESC → streak DESC → longest_streak DESC → name ASC → id ASC`
Ordering (period): `period_points DESC → earliest_qualifying_submit ASC → id ASC`

### `GET /users/profile/me`
Authenticated user's full profile with stats.

### `PATCH /users/profile/me`
Update name or avatar.

### `GET /users` — Admin only
Paginated user list. Query: `search`, `role`, `page`, `limit`.

### `PATCH /users/:id/role` — Admin only
Change user role: `user` | `admin`.

---

## 8. Analytics — `/api/v1/analytics`

### `GET /analytics/me`
Personal analytics summary.
```json
{
  "data": {
    "rank": 5,
    "total_score": 1200,
    "leaderboard_score": 800,
    "problems_solved": 24,
    "daily_challenges_completed": 8,
    "streak": 5,
    "summary": {
      "dailyChallengeStreak": 5,
      "individualStreak": 12,
      "solved_submissions": 24
    }
  }
}
```

### `GET /analytics/admin/stats` — Admin only
Platform-wide stats: active users, submissions, pending reviews, question counts.

---

## 9. Notifications — `/api/v1/notifications`

### `GET /notifications`
Auth: Required. Query: `category`, `unreadOnly`, `page`, `limit`.

### `PATCH /notifications/:id/read`
Mark a single notification as read.

### `POST /notifications/read-all`
Mark all as read. Optional body: `{ "category": "submission" }`.

---

## 10. Admin — Audit Logs

### `GET /admin/audit-logs` — Admin only
Immutable audit log of all admin operations.

Query: `action`, `resource_type`, `actor_id`, `from_date`, `to_date`, `page`, `limit`.

---

## 11. AI Question Generation — `/api/v1/ai-questions`

### `POST /ai-questions/generate` — Admin only
Generate language-independent problem specs via LLM.
```json
// Request
{ "topic": "arrays", "difficulty": "medium", "count": 3 }
```
Generated specs require admin review before publishing.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid request fields |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global `/api/v1` | 500 req / 15 min (production) |
| `POST /code/run` | 30 req / min |
| `POST /code/submit` | 15 req / min |
| `POST /dsa-ai/*` | 100 req / 15 min |
