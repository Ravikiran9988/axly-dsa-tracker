# Axly DSA Tracker — API Reference (v1)

Base URL: `/api/v1`

---

## 1. Authentication (`/api/v1/auth`)

### `POST /auth/login`
- **Auth**: None
- **Body**: `{ "email": "alex@example.com", "password": "..." }` or `{ "user_id": "usr-alex" }` (demo mode)
- **Response `200 OK`**: `{ "token": "jwt-token-string", "user": { ... } }`

### `POST /auth/verify`
- **Auth**: Bearer token required
- **Role**: Authenticated User / Admin
- **Description**: Re-validates session token and returns resolved user profile and role.
- **Response `200 OK`**:
```json
{
  "user": {
    "id": "usr-alex",
    "name": "Alex Mercer",
    "email": "alex@example.com",
    "role": "user",
    "created_at": "2026-08-26T00:00:00.000Z"
  }
}
```

### `POST /auth/logout`
- **Auth**: Bearer token required
- **Response `200 OK`**: `{ "message": "Logged out successfully" }`

---

## 2. Practice Problem Bank (`/api/v1/practice`)

### `GET /practice/problems`
- **Auth**: Required
- **Query Parameters**:
  - `topic`: string (e.g. `arrays`, `strings`, `trees`)
  - `pattern`: string (e.g. `two-pointers`, `sliding-window`)
  - `difficulty`: `easy` | `medium` | `hard`
  - `status`: `not_started` | `in_progress` | `solved` | `abandoned`
  - `search`: string
  - `page`: number (default: 1)
  - `limit`: number (default: 20, max: 100)
- **Response `200 OK`**: Paginated array of practice problems with student status and progress metadata.

### `GET /practice/problems/:id` (or `GET /practice/:id`)
- **Auth**: Required
- **Description**: Retrieves full problem specification, constraints, public test cases, and starter code templates.

### `POST /practice/problems/:id/start`
- **Auth**: Required
- **Description**: Records start timestamp and transitions status to `in_progress`.

### `POST /practice/problems/:id/abandon`
- **Auth**: Required
- **Description**: Explicitly abandons/skips an in-progress problem.

### `POST /practice/problems/:id/submission`
- **Auth**: Required
- **Body**: `{ "status": "solved" | "attempted", "code": "...", "language": "..." }`
- **Description**: Records practice attempt (awards **0 competitive points** by design).

### `GET /practice/progress`
- **Auth**: Required
- **Response `200 OK`**: Overall solved count (out of 80), percentage, and topic-by-topic mastery breakdown.

### `GET /practice/topics`
- **Auth**: Required
- **Response `200 OK`**: List of all 8 core practice topics and problem counts.

### `GET /practice/patterns`
- **Auth**: Required
- **Response `200 OK`**: List of all approved algorithmic patterns and applicable topics.

---

## 3. Code Execution (`/api/v1/code`)

### `POST /code/run`
- **Auth**: Required
- **Rate Limit**: 30 requests / min
- **Body**:
```json
{
  "question_id": "arr-001",
  "language": "javascript",
  "source_code": "const fs = require('fs'); ...",
  "custom_input": "optional custom stdin string"
}
```
- **Response `200 OK`**:
```json
{
  "data": {
    "question_id": "arr-001",
    "language": "javascript",
    "status": "Accepted",
    "passed_tests": 2,
    "total_tests": 2,
    "execution_time_ms": 42,
    "results": [
      {
        "test_index": 1,
        "status": "Accepted",
        "input": "[[2,7,11,15],9]",
        "expected_output": "[0,1]",
        "actual_output": "[0,1]"
      }
    ]
  }
}
```

### `POST /code/submit`
- **Auth**: Required
- **Rate Limit**: 15 requests / min
- **Body**:
```json
{
  "question_id": "arr-001",
  "language": "javascript",
  "source_code": "const fs = require('fs'); ..."
}
```
- **Response `200 OK`**: Evaluates against all public & hidden test cases, updates practice/submission progress, and returns detailed test results.

### `GET /code/submissions/:question_id`
- **Auth**: Required
- **Response `200 OK`**: Returns past code submissions for the authenticated user on the given problem.

---

## 4. Daily Challenge (`/api/v1/daily-question`)

### `GET /daily-question`
- **Auth**: Required
- **Query Parameters**: `date` (optional, YYYY-MM-DD UTC)
- **Response `200 OK`**: Returns active Daily Challenge for the date.

### `POST /daily-question`
- **Auth**: Required
- **Role**: Admin only
- **Body**: `{ "question_id": "arr-001", "date": "2026-08-29" }`
- **Response `200 OK`**: Sets the scheduled Daily Challenge.

---

## 5. Question Management (`/api/v1/questions`)

### `GET /questions`
- **Auth**: Required
- **Role**: User / Admin
- **Query Parameters**: `difficulty`, `topic_id`, `page`, `limit`, `search`
- **Response `200 OK`**: Paginated list of questions from the global repository.

### `GET /questions/:id`
- **Auth**: Required
- **Response `200 OK`**: Full question record.

### `POST /questions`
- **Auth**: Required
- **Role**: Admin only
- **Body**: Question schema (`title`, `difficulty`, `topic_id`, `description`, `constraints`, `test_cases`, etc.)
- **Response `201 Created`**

### `PUT /questions/:id` / `PATCH /questions/:id`
- **Auth**: Required
- **Role**: Admin only
- **Response `200 OK`**: Updates question and creates an audited version record.

### `DELETE /questions/:id`
- **Auth**: Required
- **Role**: Admin only
- **Description**: Soft-deletes (`is_active = 0`). Returns `409 Conflict` if the question is the active Daily Challenge for today.

---

## 6. AI Question Generation (`/api/v1/ai-questions`)

### `POST /ai-questions/generate`
- **Auth**: Required
- **Role**: Admin only
- **Body**:
```json
{
  "topic": "arrays",
  "difficulty": "medium",
  "count": 3
}
```
- **Description**: Generates language-independent question specifications and standard I/O test cases via LLM.

---

## 7. Admin Audit Logs (`/api/v1/admin/audit-logs`)

### `GET /admin/audit-logs`
- **Auth**: Required
- **Role**: Admin only
- **Query Parameters**: `page`, `limit`, `action`, `user_id`
- **Response `200 OK`**: Paginated audit log of admin operations.

---

## 8. DSA AI Coach & Code Verification (`/api/v1/dsa-ai`)

### `POST /dsa-ai/coach`
- **Auth**: Required (User / Admin)
- **Rate Limit**: 100 requests per 15 minutes
- **Body**:
```json
{
  "question": "How do I approach this problem?",
  "problemId": "q-two-sum",
  "action": "HINT" | "EXPLAIN" | "APPROACH" | "SOLUTION" | "COMPLEXITY" | "CODE_REVIEW" | "DEBUG",
  "language": "javascript",
  "code": "function twoSum(...) { ... }",
  "hintIndex": 0,
  "verify": true
}
```
- **Response `200 OK`**:
```json
{
  "data": {
    "intent": "HINT",
    "source": "database",
    "topic": "Arrays",
    "pattern": "Hash Map Lookup",
    "answer": "Hint 1 of 2: Use a hash table to check for target complements in O(1) time.",
    "code": null,
    "complexity": {
      "time": "O(N)",
      "space": "O(N)"
    },
    "verification": null
  }
}
```

### `POST /dsa-ai/analyze`
- **Auth**: Required
- **Description**: Deterministic Phase 1 problem matching, intent detection, and Knowledge Graph lookup without LLM cost.
- **Body**: `{ "question": "...", "problemId": "..." }`
- **Response `200 OK`**: Detailed intent, matched problem, taxonomy, and graph context.

### `POST /dsa-ai/generate`
- **Auth**: Required
- **Description**: Generates AI guidance with Groq multi-key failover (`GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GROQ_API_KEY_3`).
- **Body**: `{ "question": "...", "problemId": "...", "code": "..." }`

### `POST /dsa-ai/verify`
- **Auth**: Required
- **Description**: Executes solution code inside the sandboxed code executor against problem test cases with bounded self-correction (max 2 attempts).
- **Body**: `{ "problemId": "q-two-sum", "language": "javascript", "code": "..." }`
- **Response `200 OK`**: `{ "data": { "verified": true, "status": "Accepted", "passed_tests": 5, "total_tests": 5, "execution_time_ms": 42 } }`

