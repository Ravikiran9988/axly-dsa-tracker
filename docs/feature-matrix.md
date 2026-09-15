# Axly DSA Tracker — Feature Matrix

| Feature | User | Route | Frontend | Backend | Database | API | Auth | RBAC | Tests | Mobile | Desktop | Theme | Status | Notes |
|---------|------|-------|----------|---------|----------|-----|------|------|-------|--------|---------|-------|--------|-------|
| Landing Page | Public | `/` | LandingPage.jsx | — | — | — | No | No | Playwright | Yes | Yes | Yes | Implemented | Marketing CTA |
| Email Signup | Public | `/signup` | Signup.jsx | authController | users, auth_tokens | POST /auth/signup | No | No | Playwright | Yes | Yes | Yes | Implemented | OTP verification |
| Email Login | Public | `/login` | Login.jsx | authController | users | POST /auth/login | No | No | Playwright | Yes | Yes | Yes | Implemented | JWT issued |
| Google OAuth | Public | `/login` | Login.jsx | authController | users | Supabase | No | No | — | Yes | Yes | Yes | Implemented | PKCE flow |
| Forgot Password | Public | `/forgot-password` | ForgotPassword.jsx | authController | auth_tokens | POST /auth/forgot-password | No | No | — | Yes | Yes | Yes | Implemented | Email reset link |
| Verify Email | Public | `/verify-email/:token` | VerifyEmail.jsx | authController | users | POST /auth/verify-email | No | No | — | Yes | Yes | Yes | Implemented | Token-based |
| Student Dashboard | Student | `/dashboard` | UserDashboard.jsx | progressService, streakService | submissions, users | GET /progress/me | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Stats overview |
| Practice Browser | Student | `/practice` | AvailableChallenges.jsx | practiceService | questions, topics, practice_progress | GET /practice/problems | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Filtering + pagination |
| Problem Workspace | Student | `/solve/:id` | ProblemWorkspace.jsx | questionService, executionService | questions, test_cases, submissions | GET /questions/:id, POST /code/run | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Code editor + runner |
| Code Execution | Student | `/solve/:id` | ProblemWorkspace.jsx | executionService | — | POST /code/run | Yes | No | Backend | Yes | Yes | — | Implemented | 6 languages, Docker |
| Code Submission | Student | `/solve/:id` | ProblemWorkspace.jsx | submissionService, scoringService | submissions | POST /code/submit | Yes | No | Backend | Yes | Yes | — | Implemented | Score calculated |
| Daily Challenge | Student | `/daily` | DailyChallenge.jsx | dailyChallengeService | daily_challenge_metadata, questions | GET /daily-challenges/today | Yes | No | Playwright | Yes | Yes | Yes | Implemented | One per IST day |
| Expired DC → Practice | Student | `/practice` | AvailableChallenges.jsx | practiceService | questions, daily_challenge_metadata | GET /practice/problems | Yes | No | — | Yes | Yes | Yes | Implemented | Automatic after expiry |
| Submission History | Student | `/submissions` | SubmissionHistory.jsx | submissionService | submissions | GET /submissions | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Per-question history |
| Student Analytics | Student | `/analytics` | StudentAnalytics.jsx | analyticsService | submissions, questions | GET /analytics/me | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Charts + breakdowns |
| AI Coach | Student | `/ai-coach` | DsaAiCoachPanel.jsx | dsaAiCoachService | questions, test_cases | POST /dsa-ai/coach | Yes | No | Playwright | Yes | Yes | Yes | Implemented | 7 action types |
| Leaderboard | Student | `/leaderboard` | Leaderboard.jsx | leaderboardService | users, points_ledger | GET /users/leaderboard | Yes | No | Playwright | Yes | Yes | Yes | Implemented | DC points only |
| Profile | Student | `/profile` | UserProfile.jsx | userController | users | GET/PUT /users/profile/me | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Editable fields |
| Notifications | Student | `/notifications` | NotificationsPage.jsx | notificationService | notifications | GET /notifications | Yes | No | Playwright | Yes | Yes | Yes | Implemented | Category filtering |
| Theme Toggle | All | Any | Navbar.jsx | — | — | — | No | No | Playwright | Yes | Yes | Yes | Implemented | Light/dark |
| Admin Dashboard | Admin | `/admin-dashboard` | AdminCoreDashboard.jsx | progressService, analyticsService | users, questions | GET /progress/admin/stats | Yes | Admin | Playwright | Yes | Yes | Yes | Implemented | System stats |
| Question Bank | Admin | `/admin-challenges` | AdminQuestions.jsx | questionService | questions, topics, patterns | GET /questions | Yes | Admin | Playwright | Yes | Yes | Yes | Implemented | CRUD + filtering |
| AI Question Gen | Admin | `/admin-challenges` | AdminQuestionModal.jsx | aiQuestionGenerationPipeline | questions, test_cases | POST /ai-questions/generate | Yes | Admin | Backend | Yes | Yes | Yes | Implemented | Full pipeline |
| QB Auto-Fill | Admin | `/admin-challenges` | AdminQuestions.jsx | questionBankAutomationService | question_bank_automation_settings | PATCH /ai-questions/question-bank/automation/settings | Yes | Admin | Backend | — | Yes | Yes | Implemented | Every 2 hours |
| DC Management | Admin | `/admin-daily` | AdminDailyChallenge.jsx | dailyChallengeService | daily_challenge_metadata, questions | GET /daily-challenges | Yes | Admin | Playwright | Yes | Yes | Yes | Implemented | Full lifecycle |
| DC AI Assist | Admin | `/admin-daily` | AdminDailyChallengeModal.jsx | aiDailyChallengeService | questions | POST /daily-challenges/generate-ai | Yes | Admin | Backend | Yes | Yes | Yes | Implemented | Generate via AI |
| DC Auto-Fill | Admin | `/admin-daily` | AdminDailyChallenge.jsx | dailyChallengeAutomationService | daily_challenge_automation_settings | POST /daily-challenges/automation/run-now | Yes | Admin | Backend | — | Yes | Yes | Implemented | 00:30 IST scheduled |
| DC Schedule | Admin | `/admin-daily` | AdminScheduleDailyModal.jsx | dailyChallengeService | daily_challenge_metadata | POST /daily-challenges/:id/schedule | Yes | Admin | Backend | Yes | Yes | Yes | Implemented | Future date |
| DC Publish | Admin | `/admin-daily` | AdminDailyChallenge.jsx | dailyChallengeService | daily_challenge_metadata | POST /daily-challenges/:id/publish | Yes | Admin | Backend | Yes | Yes | Yes | Implemented | Immediate publish |
| User Management | Admin | `/admin-users` | AdminUsers.jsx | userController | users | GET /users | Yes | Admin | Playwright | Yes | Yes | Yes | Implemented | List + role update |
| Submissions Review | Admin | `/admin-reviews` | SubmissionReviewConsole.jsx | submissionController | submissions | POST /submissions/:id/review | Yes | Admin/Mentor | Playwright | Yes | Yes | Yes | Implemented | Manual + AI review |
| Audit Logs | Admin | `/admin-audit` | AdminAuditLogs.jsx | auditController | admin_audit_logs | GET /admin/audit-logs | Yes | Admin | Playwright | Yes | Yes | Yes | Implemented | Admin action trail |
| Progress View | Admin | `/admin-progress` | AdminProgress.jsx | progressService | submissions, users | GET /progress/admin | Yes | Admin | Playwright | Yes | Yes | Yes | Implemented | Aggregate stats |
| Settings | Admin | `/admin-settings` | AdminSettings.jsx | — | daily_challenge_automation_settings | PATCH /daily-challenges/automation/settings | Yes | Admin | — | Yes | Yes | Yes | Implemented | Automation config |
| Health Check | System | `/health` | — | app.js | — | GET /health | No | No | — | — | — | — | Implemented | Liveness probe |
| Recommendations | Student | Any | — | recommendationService | submissions, questions | GET /recommendations | Yes | No | Backend | Yes | Yes | — | Implemented | Weak topic focus |
| Achievements | Student | Any | — | recommendationService | submissions, users | GET /recommendations/achievements | Yes | No | Backend | Yes | Yes | — | Implemented | 8 badge types |
