# Axly DSA Tracker — Complete Route Map

## Frontend Routes

### Public Routes
| Route | Page | Component | Auth | Notes |
|-------|------|-----------|------|-------|
| `/` | Landing Page | `LandingPage.jsx` | No | Redirects to dashboard if logged in |
| `/login` | Login | `Login.jsx` | No | Redirects to dashboard if logged in |
| `/signup` | Signup | `Signup.jsx` | No | Redirects to dashboard if logged in |
| `/forgot-password` | Forgot Password | `ForgotPassword.jsx` | No | Redirects to dashboard if logged in |
| `/reset-password/:token?` | Reset Password | `ResetPassword.jsx` | No | Redirects to dashboard if logged in |
| `/verify-email/:token?` | Verify Email | `VerifyEmail.jsx` | No | Redirects to dashboard if logged in |

### Student Routes (Protected)
| Route | Page | Component | Notes |
|-------|------|-----------|-------|
| `/dashboard` | Student Dashboard | `UserDashboard.jsx` | Via `MainLayout` |
| `/practice` | Available Challenges | `AvailableChallenges.jsx` | Practice problem browser |
| `/available` | Redirect | → `/practice` | Alias |
| `/daily` | Daily Challenge | `DailyChallenge.jsx` | Today's active challenge |
| `/daily-challenge` | Redirect | → `/daily` | Alias |
| `/solve/:id` | Problem Workspace | `ProblemWorkspace.jsx` | Code editor + runner |
| `/submissions` | Submission History | `SubmissionHistory.jsx` | Per-question history |
| `/analytics` | Student Analytics | `StudentAnalytics.jsx` | Progress charts |
| `/progress` | Redirect | → `/analytics` | Alias |
| `/profile` | User Profile | `UserProfile.jsx` | Editable profile |
| `/notifications` | Notifications | `NotificationsPage.jsx` | In-app notifications |
| `/leaderboard` | Leaderboard | `Leaderboard.jsx` | DC points ranking |
| `/ai-coach` | AI Coach | `DsaAiCoachPanel.jsx` | 7 action types |
| `/dsa-ai` | Redirect | → `/ai-coach` | Alias |
| `/learning-path` | Placeholder | Inline | "Coming soon" |
| `/settings` | Placeholder | Inline | "Coming soon" |

### Admin Routes (Protected + requireAdmin)
| Route | Page | Component | Notes |
|-------|------|-----------|-------|
| `/admin-dashboard` | Admin Dashboard | `AdminCoreDashboard.jsx` | System stats |
| `/admin-challenges` | Question Bank | `AdminQuestions.jsx` | CRUD + automation |
| `/admin-questions` | Redirect | → `/admin-challenges` | Alias |
| `/admin-daily` | Daily Challenge | `AdminDailyChallenge.jsx` | Full lifecycle |
| `/admin-reviews` | Review Console | `SubmissionReviewConsole.jsx` | Manual + AI review |
| `/admin-users` | User Management | `AdminUsers.jsx` | List + roles |
| `/admin-progress` | Progress | `AdminProgress.jsx` | Aggregate stats |
| `/admin-submissions` | Submissions | `AdminSubmissions.jsx` | All submissions |
| `/admin-audit` | Audit Logs | `AdminAuditLogs.jsx` | Admin action trail |
| `/admin-settings` | Settings | `AdminSettings.jsx` | Automation config |

### Fallback
| Route | Behavior |
|-------|----------|
| `*` | `<Navigate to="/" replace />` |

---

## Backend API Routes

### Base URL: `/api/v1`

### Auth — `/api/v1/auth`
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/signup` | No | auth | Register new user |
| POST | `/verify-otp` | No | auth | Verify OTP |
| POST | `/resend-otp` | No | auth | Resend OTP |
| POST | `/login` | No | auth | Email/password login |
| POST | `/verify-email` | No | auth | Verify email |
| POST | `/resend-verification` | No | auth | Resend verification |
| POST | `/forgot-password` | No | auth | Initiate password reset |
| POST | `/reset-password` | No | auth | Complete password reset |
| GET | `/verify` | Yes | auth | Verify session |
| POST | `/verify` | Yes | auth | Verify session |
| POST | `/dev-login` | No | auth | Dev-only fast login |

### Questions — `/api/v1/questions`
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/` | Yes | — | List questions |
| GET | `/topics` | Yes | — | List topics |
| GET | `/:id` | Yes | — | Get question by ID |
| POST | `/` | Yes | Admin | Create question |
| PUT | `/:id` | Yes | Admin | Update question |
| PATCH | `/:id` | Yes | Admin | Update question |
| POST | `/:id/validate` | Yes | Admin | Validate question |
| DELETE | `/:id` | Yes | Admin | Delete question |
| GET | `/:id/versions` | Yes | Admin | Get versions |
| GET | `/:id/versions/compare` | Yes | Admin | Compare versions |
| GET | `/:id/versions/:version` | Yes | Admin | Get specific version |
| POST | `/:id/versions/:version/restore` | Yes | Admin | Restore version |

### Practice — `/api/v1/practice`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/progress` | Yes | Personal progress |
| GET | `/topics` | Yes | Topic list |
| GET | `/patterns` | Yes | Pattern list |
| GET | `/problems` | Yes | Problem browser |
| GET | `/problems/:id` | Yes | Problem details |
| POST | `/problems/:id/start` | Yes | Start problem |
| POST | `/problems/:id/abandon` | Yes | Abandon problem |
| POST | `/problems/:id/submission` | Yes | Record submission |
| GET | `/:id` | Yes | Alias for problems/:id |
| POST | `/:id/start` | Yes | Alias |
| POST | `/:id/abandon` | Yes | Alias |
| POST | `/:id/submission` | Yes | Alias |

### Daily Challenges — `/api/v1/daily-challenges`
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/today` | Yes | — | Today's active DC |
| GET | `/topics` | Yes | — | DC topics |
| GET | `/` | Yes | — | List all DCs |
| GET | `/:id` | Yes | — | Get DC by ID |
| POST | `/` | Yes | Admin | Create DC |
| PUT | `/:id` | Yes | Admin | Update DC |
| DELETE | `/:id` | Yes | Admin | Delete DC |
| DELETE | `/:id/permanent` | Yes | Admin | Permanent delete |
| POST | `/:id/schedule` | Yes | Admin | Schedule DC |
| POST | `/:id/publish` | Yes | Admin | Publish DC |
| POST | `/:id/publish-now` | Yes | Admin | Publish immediately |
| POST | `/:id/unpublish` | Yes | Admin | Unpublish DC |
| PATCH | `/:id/unpublish` | Yes | Admin | Unpublish DC |
| POST | `/:id/archive` | Yes | Admin | Archive DC |
| POST | `/from-practice` | Yes | Admin | Create from practice |
| POST | `/generate-ai` | Yes | Admin | AI generate |
| POST | `/generate-ai/test-cases` | Yes | Admin | AI generate test cases |
| POST | `/generate-ai/hints` | Yes | Admin | AI generate hints |
| POST | `/validate-duplicate` | Yes | Admin | Validate duplicate |
| GET | `/automation/status` | Yes | Admin | Automation status |
| PATCH | `/automation/settings` | Yes | Admin | Update settings |
| POST | `/automation/run-now` | Yes | Admin | Run auto-fill now |
| GET | `/automation/logs` | Yes | Admin | Automation logs |

### Submissions — `/api/v1/submissions`
| Method | Path | Auth | RBAC | Rate Limit | Description |
|--------|------|------|------|------------|-------------|
| GET | `/` | Yes | — | — | List submissions |
| POST | `/` | Yes | — | submission | Create/update submission |
| POST | `/toggle` | Yes | — | submission | Toggle submission |
| PATCH | `/:id` | Yes | — | — | Update submission |
| POST | `/:id/abandon` | Yes | — | — | Abandon submission |
| POST | `/github` | Yes | — | submission | GitHub submission |
| POST | `/:id/ai-review` | Yes | Admin/Mentor | AI | AI review |
| POST | `/:id/review` | Yes | Admin/Mentor | — | Manual review |

### Code Execution — `/api/v1/code`
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/run` | Yes | execution | Run code against tests |
| POST | `/submit` | Yes | submission | Submit solution |
| GET | `/submissions/:question_id` | Yes | — | Submission history |

### Progress — `/api/v1/progress`
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/me` | Yes | — | My progress |
| GET | `/admin` | Yes | Admin | Admin aggregate |
| GET | `/stats` | Yes | Admin | System stats |

### Analytics — `/api/v1/analytics`
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/me` | Yes | — | My analytics |
| GET | `/admin/stats` | Yes | Admin | Admin stats |

### Recommendations — `/api/v1/recommendations`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Get recommendations |
| GET | `/recommendations` | Yes | Alias |
| GET | `/achievements` | Yes | Achievement badges |

### Users — `/api/v1/users`
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/profile/me` | Yes | — | My profile |
| PATCH | `/profile/me` | Yes | — | Update profile |
| GET | `/leaderboard` | Yes | — | Leaderboard |
| GET | `/` | Yes | Admin | List users |
| GET | `/:id` | Yes | Admin | Get user |
| PATCH | `/:id/role` | Yes | Admin | Update role |

### Notifications — `/api/v1/notifications`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List notifications |
| PATCH | `/:id/read` | Yes | Mark read |
| POST | `/read-all` | Yes | Mark all read |

### AI Questions — `/api/v1/ai-questions`
| Method | Path | Auth | RBAC | Rate Limit | Description |
|--------|------|------|------|------------|-------------|
| POST | `/generate` | Yes | Admin | AI | Generate question |
| POST | `/question-bank/manual` | Yes | Admin | AI | Manual QB generation |
| GET | `/question-bank/status` | Yes | Admin | — | QB generation status |
| GET | `/question-bank/automation/settings` | Yes | Admin | — | QB settings |
| PATCH | `/question-bank/automation/settings` | Yes | Admin | — | Update QB settings |
| GET | `/question-bank/automation/logs` | Yes | Admin | — | QB logs |

### DSA AI — `/api/v1/dsa-ai`
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/analyze` | Yes | dsaAi | Analyze question |
| POST | `/generate` | Yes | AI | Generate guidance |
| POST | `/coach` | Yes | AI | Full coaching |
| POST | `/verify` | Yes | AI | Verify code |

### Audit Logs — `/api/v1/admin/audit-logs`
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/` | Yes | Admin | List audit logs |

### Health — `/health`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/health/live` | No | Liveness |
| GET | `/health/ready` | No | Readiness |
