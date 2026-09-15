# Axly DSA Tracker — Daily Challenge System

## Overview

One global Daily Challenge is selected per IST calendar day. All students see the same challenge. The system uses **Asia/Kolkata (IST)** as the canonical timezone.

---

## Lifecycle

```
Draft → Scheduled → Published → Archived
```

### Status Definitions
| Status | Description |
|--------|-------------|
| `draft` | Created but not scheduled |
| `scheduled` | Assigned to a future IST date |
| `published` | Active and visible to students |
| `archived` | Expired Daily Challenge metadata (does NOT mean the canonical question is archived) |

---

## Timezone Rules

### IST Canonical
- All date calculations use `Asia/Kolkata` via `dateUtils.js`
- **00:30 IST Boundary:** Daily challenge shifts at 00:30 IST (not midnight)
- Before 00:30 IST: Previous challenge still active
- At 00:29 IST: Previous challenge expires
- At 00:30 IST: New challenge published

### Key Functions
| Function | Purpose |
|----------|---------|
| `getIstClock(date)` | Get IST hour/minute from any Date |
| `getCanonicalIstDate(date)` | Get IST date with -30min shift |
| `getNextCanonicalIstDate(date)` | Get next IST date |

---

## Automation

### 12:30 AM IST Scheduler (`runDailyScheduledAutomation`)
1. **Publish Today:** Find challenge scheduled for today → publish
2. **Check Tomorrow:** If tomorrow already scheduled → stop (NOOP)
3. **Generate Tomorrow:** Create new challenge via AI pipeline
4. **Index:** Run embedding/novelty indexing
5. **Schedule:** Promote to `scheduled` status for tomorrow

### Admin "Run Auto-Fill Now" (`runAdminAutoFillNow`)
1. **Calculate Tomorrow:** `getNextCanonicalIstDate()`
2. **Check Tomorrow:** Does tomorrow already have a scheduled DC?
3. **Decision Matrix:**

| Tomorrow Scheduled | Result |
|-------------------|--------|
| YES | Generate NEW → DRAFT (existing untouched) |
| NO | Generate NEW → Index → SCHEDULED |

4. **Indexing Gate:** Challenge cannot become `scheduled` until indexing succeeds
5. **Logging:** Writes to `daily_challenge_automation_logs`

---

## Admin Workflow

### Create
1. **Manual:** Admin creates DC directly with title, description, test cases
2. **AI Assist:** Admin triggers AI generation → preview → save
3. **From Practice:** Promote existing practice problem to DC
4. **Auto-Fill:** Automated generation via scheduler or manual trigger

### Schedule
- Assign future IST date
- Validates no conflict with existing scheduled DC
- Sets status to `scheduled`

### Publish
- Makes DC visible to students
- Sets status to `published`

### Archive (Daily Challenge Expiration)
- Moves DC to practice bank (`is_practice = 1` on question)
- Sets `daily_challenge_metadata.status` to `archived`
- **Invariant:** `questions.status` MUST NEVER become `archived`. The canonical question preserves its status (e.g., `published`) for the practice bank.

---

## Student Workflow

### View Today's Challenge
- `GET /api/v1/daily-challenges/today`
- Returns published DC for today's IST date
- 404 if none exists

### Solve
- Open challenge in ProblemWorkspace
- Write code → Run tests → Submit
- Score calculated (test performance + time + attempts)

### Points
| Difficulty | Base Points |
|-----------|-------------|
| Easy | 50 |
| Medium | 100 |
| Hard | 150 |

- Streak bonus: +10 per consecutive day (max +50)
- Points awarded once per challenge per user

---

## Expiration

### Automatic (`runDailyExpiration`)
- Runs at 00:29 IST
- Finds published DCs with `scheduled_date < today`
- Sets `daily_challenge_metadata.status` to `archived`
- Sets `is_practice = 1` on question (moves to practice)
- Does NOT alter the canonical `questions.status`

### After Expiration
- DC problems available in Practice bank
- Historical submissions preserved
- No longer visible on `/today`

---

## Idempotency

### Scheduled Date
- `daily_challenge_metadata.scheduled_date` has UNIQUE constraint
- Partial index: `WHERE scheduled_date IS NOT NULL AND status != 'archived'`
- Prevents double-scheduling

### Auto-Fill
- Checks tomorrow's scheduled status before generating
- Prevents duplicate challenges for same date

---

## Question Relationship

### Unified Model
- DC problems live in `questions` table (same as practice)
- `daily_challenge_metadata` links question to DC scheduling
- 1:1 relationship via `question_id` (PK of metadata)

### Metadata Fields
| Field | Purpose |
|-------|---------|
| `question_id` | FK to questions (PK) |
| `scheduled_date` | Target IST date |
| `status` | draft/scheduled/published/archived |
| `created_via` | manual/ai/ai_automation |
| `custom_topic` | Optional topic override |

### Canonical Status Invariants
- **Metadata Ownership:** `daily_challenge_metadata` owns the Daily Challenge lifecycle state (draft → scheduled → published → archived).
- **Synchronization:** When creating a Daily Challenge from Practice, the canonical `questions.status` remains synchronized with the metadata status (`draft` or `scheduled`).
- **Archive Invariant:** When a Daily Challenge expires, its metadata becomes `archived`, but the canonical `questions.status` must **never** become `archived`. Archived metadata does not mean the canonical question is archived.
- **Transition:** Practice ↔ Daily Challenge transitions strictly preserve the single canonical-question model.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `daily_challenge_metadata` | Scheduling and lifecycle |
| `daily_challenge_automation_settings` | Automation configuration |
| `daily_challenge_automation_logs` | Automation audit trail |
| `questions` | Challenge content |
| `test_cases` | Test cases |
| `submissions` | Student submissions |

---

## Known Limitations

1. **No per-cohort DC:** All students see the same challenge
2. **No DC preview:** Students cannot preview upcoming challenges
3. **No DC history page:** Expired DCs only accessible via practice search
4. **Single timezone:** All dates use IST; no per-user timezone support
