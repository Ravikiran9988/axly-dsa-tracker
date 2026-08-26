# Axly DSA Tracker — API Reference (v1)

Base URL: `/api/v1`

---

## 1. Authentication

### `POST /auth/verify`
- **Auth**: Bearer token required
- **Role**: Any authenticated user
- **Description**: Re-validates the session token server-side and returns the resolved user and role.
- **Response `200 OK`**:
```json
{
  "user": {
    "id": "usr-uuid",
    "name": "Alex Mercer",
    "email": "alex@example.com",
    "role": "user",
    "created_at": "2026-08-26T00:00:00.000Z"
  }
}
```

---

## 2. Questions

### `GET /questions`
- **Auth**: Required
- **Role**: User / Admin
- **Query Parameters**:
  - `difficulty`: `easy` | `medium` | `hard`
  - `topic_id`: string (UUID)
  - `assigned`: `true` | `false` (User perspective: assigned to self; Admin perspective: assigned to at least 1 user)
  - `page`: number (default: 1)
  - `limit`: number (default: 20, max: 100)
- **Response `200 OK`**:
```json
{
  "data": [
    {
      "id": "q-two-sum",
      "title": "Two Sum",
      "difficulty": "easy",
      "topic_id": "top-arrays",
      "topic_name": "Arrays & Hashing",
      "url": "https://leetcode.com/problems/two-sum/",
      "is_active": true,
      "created_at": "...",
      "is_assigned_to_me": true,
      "submission_status": "solved"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 10
}
```

### `POST /questions`
- **Auth**: Required
- **Role**: Admin only
- **Body**: `{ "title": "3Sum", "difficulty": "medium", "topic_id": "...", "url": "https://..." }`
- **Response `201 Created`**

### `PATCH /questions/:id`
- **Auth**: Required
- **Role**: Admin only
- **Body**: `{ "title": "...", "difficulty": "...", "topic_id": "...", "url": "..." }`
- **Response `200 OK`**

### `DELETE /questions/:id`
- **Auth**: Required
- **Role**: Admin only
- **Description**: Soft-delete (`is_active = false`). Returns `409 Conflict` if question is today's UTC daily question.
- **Response `200 OK`**: `{ "message": "Question successfully deactivated (soft-deleted)", "id": "..." }`

---

## 3. Daily Question

### `GET /daily-question`
- **Auth**: Required
- **Role**: User / Admin
- **Query Parameters**: `date` (optional, defaults to current UTC date)
- **Response `200 OK` (When set)**: `{ "data": { "id": "...", "title": "Two Sum", ... } }`
- **Response `200 OK` (When empty)**: `{ "data": null, "message": "No daily question set for today" }`

### `POST /daily-question`
- **Auth**: Required
- **Role**: Admin only
- **Body**: `{ "question_id": "..." }`
- **Response `200 OK`**

---

## 4. Assignments

### `POST /assignments`
- **Auth**: Required
- **Role**: Admin only
- **Body**: `{ "user_id": "...", "question_id": "..." }`
- **Response `201 Created`**

### `POST /assignments/bulk`
- **Auth**: Required
- **Role**: Admin only
- **Body**: `{ "user_ids": ["..."], "question_ids": ["..."] }`
- **Response `200 OK`**

### `DELETE /assignments/:id`
- **Auth**: Required
- **Role**: Admin only
- **Description**: Soft unassign: sets `status = 'unassigned'`. Row retained.
- **Response `200 OK`**

---

## 5. Submissions & Progress

### `PATCH /submissions/:id`
- **Auth**: Required
- **Role**: User (own record only, 403 otherwise)
- **Body**: `{ "status": "not_started" | "attempted" | "solved" | "skipped" }`
- **Response `200 OK`**

### `GET /progress/me`
- **Auth**: Required
- **Role**: User
- **Response `200 OK`**:
```json
{
  "data": {
    "assigned_count": 5,
    "attempted_count": 3,
    "solved_count": 2,
    "pending_count": 3,
    "completion_percentage": 40,
    "difficulty_breakdown": {
      "easy": { "assigned": 2, "solved": 2, "percentage": 100 },
      "medium": { "assigned": 2, "solved": 0, "percentage": 0 },
      "hard": { "assigned": 1, "solved": 0, "percentage": 0 }
    },
    "historical_solved_count": 2
  }
}
```

### `GET /progress/admin`
- **Auth**: Required
- **Role**: Admin only
- **Query Parameters**: `page`, `limit`, `search`
- **Response `200 OK`**: Paginated aggregate progress across learners.
