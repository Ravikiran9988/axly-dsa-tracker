# Axly DSA Tracker — API Reference

> **Base URL:** `/api/v1`
> **Auth Header:** `Authorization: Bearer <jwt>`
> **Content-Type:** `application/json`

All successful responses wrap data in a `data` object: `{ "data": { ... } }`
All error responses provide an error object: `{ "error": { "code": "ERROR_CODE", "message": "..." } }`

---

## 1. Authentication — `/api/v1/auth`
Rate limiting: `authRateLimiter` applies to all endpoints in this group.

- **`POST /signup`**: Register a new student user.
- **`POST /login`**: Authenticate with email/password and receive a JWT.
- **`POST /dev-login`**: Fast login for development without password (accepts `email`, `role`).
- **`POST /verify-email`**: Submit an email for verification.
- **`POST /resend-verification`**: Resend email verification code.
- **`POST /verify-otp`**: Verify the emailed One Time Password.
- **`POST /resend-otp`**: Resend OTP.
- **`POST /forgot-password`**: Initiate password reset.
- **`POST /reset-password`**: Complete password reset.
- **`GET /verify` / `POST /verify`**: Re-validate the current session token (requires `authenticate` middleware).

---

## 2. Practice — `/api/v1/practice`
*Requires `authenticate` middleware.*

- **`GET /progress`**: Fetch personal practice progress statistics.
- **`GET /topics`**: List all practice topics.
- **`GET /patterns`**: List all practice algorithmic patterns.
- **`GET /problems`**: Browse the practice problem bank (paginated/filterable).
- **`GET /problems/:id`**: Get full problem details for the workspace.
- **`POST /problems/:id/start`**: Transition a problem status to `in_progress`.
- **`POST /problems/:id/abandon`**: Mark a problem as abandoned.
- **`POST /problems/:id/submission`**: Record a practice solve attempt (awards practice gamification points only).
- *(Note: Route aliases exist directly under `/practice/:id` for backward compatibility).*

---

## 3. Daily Challenges — `/api/v1/daily-challenges`
*Requires `authenticate` middleware.*

- **`GET /today`**: Fetch today's active Daily Challenge.
- **`GET /topics`**: List available topics for challenges.
- **`GET /`**: List all Daily Challenges.
- **`GET /:id`**: Fetch a specific Daily Challenge by ID.

### Admin-Only Routes (`requireRole('admin')`)
- **`POST /recommend-topic`**: Recommend a topic for the next daily challenge based on history.
- **`POST /`**: Create a Daily Challenge manually.
- **`PUT /:id`**: Update an existing challenge.
- **`POST /from-practice`**: Promote a practice problem into a Daily Challenge.
- **`POST /:id/schedule`**: Schedule a challenge for a specific date.
- **`POST /:id/publish`**: Publish a scheduled challenge.
- **`POST /:id/publish-now`**: Immediately publish a challenge.
- **`POST /:id/unpublish` / `PATCH /:id/unpublish`**: Unpublish a challenge.
- **`POST /:id/archive`**: Archive a challenge.
- **`DELETE /:id` / `DELETE /:id/permanent`**: Soft or hard delete a challenge.
- **`POST /generate-ai`**: Use LLM to generate a complete challenge specification.
- **`POST /generate-ai/test-cases`**: Generate test cases for a challenge.
- **`POST /generate-ai/hints`**: Generate hints for a challenge.
- **`POST /validate-duplicate`**: Ensure generated content is not a duplicate of existing questions.

### Daily Challenge Automation (Admin-Only)
- **`GET /automation/status`**: View the cron scheduler state.
- **`PATCH /automation/settings`**: Configure daily automated generation logic.
- **`POST /automation/run-now`**: Trigger the generation script immediately.
- **`GET /automation/logs`**: View automated generation logs.

---

## 4. Code Execution & Submissions

### Code Execution — `/api/v1/code`
*Requires `authenticate` middleware.*

- **`POST /run`**: Execute code against public test cases or custom stdin (Rate limited).
- **`POST /submit`**: Submit code against ALL test cases (including hidden). Updates practice/challenge progress based on the context.
- **`GET /submissions/:question_id`**: Fetch previous code execution history for a specific question.

### Submissions Management — `/api/v1/submissions`
*Requires `authenticate` middleware.*

- **`GET /`**: List historical submissions.
- **`POST /`**: Upsert a question submission.
- **`POST /toggle`**: Toggle submission status.
- **`PATCH /:id`**: Update a specific submission.
- **`POST /:id/abandon`**: Mark a specific submission as abandoned.
- **`POST /github`**: Sync submission directly from/to GitHub.
- **Admin/Mentor Routes**:
  - **`POST /:id/review`**: Manually review a submission.
  - **`POST /:id/ai-review`**: Request an AI code review for a submission.

---

## 5. Question Bank — `/api/v1/questions`
*Requires `authenticate` middleware.*

- **`GET /`**: Paginated list of questions.
- **`GET /topics`**: List all question topics.
- **`GET /:id`**: Get a specific question's details.

### Admin-Only Routes (`requireRole('admin')`)
- **`POST /`**: Create a new question.
- **`PUT /:id` / `PATCH /:id`**: Update an existing question (creates a version history record).
- **`DELETE /:id`**: Delete a question.
- **`POST /:id/validate`**: Validate question structure.
- **`GET /:id/versions`**: Fetch version history for a question.
- **`GET /:id/versions/:version`**: Fetch a specific historical version.
- **`GET /:id/versions/compare`**: Compare two versions of a question.
- **`POST /:id/versions/:version/restore`**: Rollback to a specific version.

---

## 6. AI Features — `/api/v1/dsa-ai` & `/api/v1/ai-questions`

### DSA Coach (`/api/v1/dsa-ai`)
*Requires `authenticate` and `dsaAiLimiter`.*

- **`POST /analyze`**: Phase 1 deterministic analysis (intent parsing, context gathering).
- **`POST /generate`**: Phase 2 LLM-backed guidance (hints, explanation, debugging).
- **`POST /coach`**: Unified coach endpoint that handles both analysis and generation transparently.
- **`POST /verify`**: Sandbox code verification with bounded LLM self-correction.

### AI Question Generation (`/api/v1/ai-questions`)
*Requires `authenticate`, `requireRole('admin')`, and `aiRateLimiter`.*

- **`POST /generate`**: Generate language-independent problem specifications.

---

## 7. Users & Leaderboard — `/api/v1/users`
*Requires `authenticate` middleware.*

- **`GET /profile/me`**: Get current authenticated user profile.
- **`PATCH /profile/me`**: Update current user profile.
- **`GET /leaderboard`**: Get the global competitive leaderboard (Daily Challenge scores only).

### Admin-Only Routes (`requireRole('admin')`)
- **`GET /`**: List all users.
- **`GET /:id`**: Get specific user details.
- **`PATCH /:id/role`**: Change user role (e.g. from `user` to `admin`).

---

## 8. Analytics & Progress

### Analytics (`/api/v1/analytics`)
*Requires `authenticate` middleware.*
- **`GET /me`**: Fetch personal analytics (score, rank, problems solved, etc.).
- **`GET /admin/stats`**: Fetch platform-wide statistics (Admin only).

### Progress (`/api/v1/progress`)
*Requires `authenticate` middleware.*
- **`GET /me`**: Fetch detailed personal progress.
- **`GET /admin`**: Fetch progress reports for users (Admin only).
- **`GET /stats`**: Alias for platform-wide stats (Admin only).

---

## 9. System Domains

### Notifications (`/api/v1/notifications`)
*Requires `authenticate` middleware.*
- **`GET /`**: List notifications for the user.
- **`PATCH /:id/read`**: Mark specific notification as read.
- **`POST /read-all`**: Mark all notifications as read.

### Audit Logs (`/api/v1/admin/audit-logs`)
*Requires `authenticate` and `requireRole('admin')`.*
- **`GET /`**: Fetch immutable audit logs of admin operations.

### Deprecated Domains
- **`/api/v1/assignments`**: Returns HTTP `410 Gone`. Assignments are removed in favor of Practice/Daily Challenge.
- **`/api/v1/cohorts`**: Returns HTTP `410 Gone`. Cohorts are no longer part of the core product.

---

## 10. System Error Codes & Rate Limits

### Error Codes
| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid request fields. |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT. |
| `FORBIDDEN` | 403 | Insufficient role (e.g., requires `admin`). |
| `NOT_FOUND` | 404 | Resource does not exist. |
| `CONFLICT` | 409 | Duplicate resource or state conflict. |
| `FEATURE_REMOVED` | 410 | Route explicitly deprecated (Assignments, Cohorts). |
| `RATE_LIMITED` | 429 | Too many requests. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |

### Rate Limits
| Scope | Limit |
|-------|-------|
| Global `/api/v1` | 500 req / 15 min (production) / 5000 (dev) |
| `POST /auth/*` | 20 req / 15 min (via `authRateLimiter`) |
| `POST /code/run` | 30 req / min (via `executionRateLimiter`) |
| `POST /code/submit` | 15 req / min (via `submissionRateLimiter`) |
| `POST /dsa-ai/*` | 100 req / 15 min (via `dsaAiLimiter`) |
