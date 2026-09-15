# Axly DSA Tracker — Admin Features

## Overview

Admin features provide complete control over questions, Daily Challenges, users, and system configuration. All admin routes require `role: 'admin'` in JWT.

---

## Navigation

### Sidebar Items
| Route | Label | Description |
|-------|-------|-------------|
| `/admin/dashboard` | Dashboard | System stats |
| `/admin/questions` | Question Bank | Manage questions |
| `/admin/daily-challenge` | Daily Challenge | DC management |
| `/admin/daily-settings` | DC Settings | Automation config |
| `/admin/users` | Users | User management |
| `/admin/submissions` | Submissions | Review queue |
| `/admin/analytics` | Analytics | System metrics |
| `/admin/audit` | Audit Logs | Activity trail |

---

## Dashboard (`/admin/dashboard`)

### Stats Cards
| Metric | Description |
|--------|-------------|
| Total Users | Registered users |
| Total Questions | In question bank |
| Active Submissions | Pending review |
| Today's DC | Current challenge |

### Charts
- **User Growth:** Line chart of registrations
- **Question Distribution:** Bar chart by topic/difficulty
- **Activity Heatmap:** Daily solve counts

---

## Question Bank (`/admin/questions`)

### Question List
| Column | Description |
|--------|-------------|
| Title | Question name |
| Topic | Main topic |
| Difficulty | Easy/Medium/Hard |
| Status | Draft/Published/Archived |
| Source | Manual/AI/AI Automation |
| Actions | Edit, Preview, Delete |

### Filters
- Topic, difficulty, status, source

### Actions
| Action | Description |
|--------|-------------|
| Add Question | Manual creation form |
| AI Generate | Trigger AI pipeline |
| Edit | Modify question |
| Preview | View question as student |
| Delete | Remove question |
| Archive | Move to archived status |
| Promote to DC | Schedule as Daily Challenge |

### Add Question Form
- Title, description, difficulty
- Topic, pattern selection
- Examples (JSON)
- Test cases (add/remove)
- Starter code (per language)
- Reference solution
- Tags, estimated time, points

### AI Generation
- **Flow:** Select topic → generate → preview → save
- **Pipeline:** 8-phase pipeline with sandbox validation
- **Output:** Title, description, test cases, solutions (6 languages), hints, starter code

---

## Daily Challenge (`/admin/daily-challenge`)

### Management View
- Today's DC (published)
- Tomorrow's DC (scheduled)
- History (archived)

### Create DC
| Method | Description |
|--------|-------------|
| Manual | Fill form directly |
| AI Assist | Generate with AI → preview → save |
| From Practice | Promote existing question |
| Auto-Fill | Automated generation |

### Schedule
- Assign future IST date
- Validates no conflict
- Sets status to `scheduled`

### Publish
- Makes DC visible to students
- Sets status to `published`

### Archive
- Moves to practice bank
- Sets `is_practice = 1`
- Sets status to `archived`

### Delete
- Removes DC entirely
- Question remains in bank

---

## DC Settings (`/admin/daily-settings`)

### Automation Settings
| Setting | Description |
|---------|-------------|
| Enabled | Toggle automation on/off |
| Mode | ai_assist / ai_generate / manual |
| Target Hour UTC | When to generate (default: 19:00 = 00:30 IST) |
| Retry Limit | Max retries on failure |

### "Run Auto-Fill Now"
- Manual trigger for DC generation
- Checks tomorrow's scheduled status
- Generates and indexes new DC
- Logs result

### Automation Logs
| Field | Description |
|-------|-------------|
| Target Date | IST date |
| Mode | ai_assist, ai_generate, manual |
| Status | success / failed / skipped |
| Failure Category | Pipeline error type |
| Question ID | Created question (if any) |
| Details | Error message |
| Timestamp | When it ran |

---

## User Management (`/admin/users`)

### User List
| Column | Description |
|--------|-------------|
| Name | User display name |
| Email | User email |
| Role | admin/mentor/user |
| Points | Combined points |
| Status | Active/Inactive |
| Actions | Edit, Deactivate |

### Actions
| Action | Description |
|--------|-------------|
| Change Role | Promote/demote user |
| Deactivate | Soft delete |
| View Profile | See user details |
| View Submissions | See user's submissions |

### Role Changes
- Admin can promote to admin
- Admin can demote (except self)
- Audit logged

---

## Submission Review (`/admin/submissions`)

### Review Queue
- Pending submissions listed
- Filter by: question, user, status

### Review Actions
| Action | Description |
|--------|-------------|
| Approve | Mark as reviewed |
| Reject | Mark as rejected |
| Feedback | Add text feedback |
| Request Changes | Send back to student |

### Review Details
- Student code
- Test results
- Score breakdown
- Previous submissions

---

## Analytics (`/admin/analytics`)

### System Metrics
| Metric | Description |
|--------|-------------|
| Daily Active Users | Users who solved problems |
| Questions Created | AI + manual |
| Submissions Today | Total submissions |
| Automation Success Rate | DC automation stats |

### Charts
- **User Growth:** Registrations over time
- **Question Distribution:** By topic, difficulty
- **Activity Heatmap:** Daily solves
- **DC Completion:** Students who solved today's DC

---

## Audit Logs (`/admin/audit`)

### Log Viewer
| Field | Description |
|-------|-------------|
| Actor | Admin who performed action |
| Action | What was done |
| Resource | What was affected |
| Before | Previous state |
| After | New state |
| IP Address | Request origin |
| Timestamp | When it happened |

### Filterable
- By actor, action, resource, date range

---

## Code Runner Status

### Health Check
- **Endpoint:** `GET /admin/runner-status`
- **Returns:** Runner availability, execution time

### Management
- View runner health
- Test code execution
- View recent errors

---

## Statistics Service

### Aggregated Stats
- Total users, questions, submissions
- DC completion rates
- Automation success rates
- AI generation metrics

### Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /admin/stats` | Dashboard statistics |
| `GET /admin/stats/daily` | Daily breakdown |
| `GET /admin/stats/topics` | Topic distribution |

---

## Question Moderation

### Review Queue
- Questions pending review
- AI-generated questions flagged for review
- Manual questions pending publication

### Actions
| Action | Description |
|--------|-------------|
| Approve | Publish question |
| Reject | Remove from queue |
| Edit | Modify before publishing |
| Request Changes | Send back to creator |

---

## System Management

### Database
- View table sizes
- Run migrations
- Backup/restore

### Configuration
- Toggle features
- Set limits
- Manage API keys

### Monitoring
- Health checks
- Error logs
- Performance metrics

---

## Audit Trail

### Logged Actions
| Action | Description |
|--------|-------------|
| QUESTION_CREATE | Question created |
| QUESTION_UPDATE | Question modified |
| QUESTION_DELETE | Question removed |
| DC_CREATE | Daily Challenge created |
| DC_SCHEDULE | DC scheduled |
| DC_PUBLISH | DC published |
| DC_ARCHIVE | DC archived |
| USER_ROLE_CHANGE | User promoted/demoted |
| USER_DEACTIVATE | User deactivated |
| SUBMISSION_REVIEW | Submission reviewed |
| AUTOMATION_RUN | DC automation triggered |
| AUTOMATION_RESULT | DC automation completed |

### Implementation
- `auditService.logAction()` called on protected mutations
- Writes to `admin_audit_logs` table
- Includes before/after data
- Sanitizes sensitive fields

---

## Known Admin Feature Gaps

1. **No bulk question import**
2. **No question export**
3. **No cohort management**
4. **No schedule visualization**
5. **No advanced filtering (regex)**
6. **No question versioning UI**
7. **No mass email notification**
