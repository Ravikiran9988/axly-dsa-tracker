# Axly DSA Tracker — Known Issues

*Only issues discovered during this audit. Not manufactured.*

---

## Critical

### 1. Hardcoded JWT Secret Fallback
- **Component:** `backend/src/middleware/auth.js:16`
- **Evidence:** If `JWT_SECRET` is not set, falls back to `'axly-dsa-tracker-dev-secret-key-32-chars-minimum'`
- **Impact:** If `NODE_ENV` is misconfigured (not `production`), all tokens are signed with a known secret
- **Suggested Fix:** Throw on startup if `JWT_SECRET` not set in production
- **Blocks Production:** Yes (if env misconfigured)

### 2. No CSRF Protection
- **Component:** `backend/src/app.js`
- **Evidence:** No CSRF middleware present. Supabase may set cookies.
- **Impact:** Cross-site requests with credentials could be exploited
- **Suggested Fix:** Add CSRF middleware for cookie-based auth flows
- **Blocks Production:** Moderate risk

---

## High

### 3. CORS Allows No-Origin Requests
- **Component:** `backend/src/app.js:60-61`
- **Evidence:** `!origin → cb(null, true)` — any request without Origin header bypasses allowlist
- **Impact:** curl, Postman, server-side requests bypass CORS entirely
- **Suggested Fix:** Reject requests with no Origin in production
- **Blocks Production:** No (but weakens CORS)

### 4. In-Memory Rate Limiting
- **Component:** `backend/src/middleware/rateLimiter.js`
- **Evidence:** Uses `express-rate-limit` with default memory store
- **Impact:** Resets on server restart; ineffective in multi-instance deployments
- **Suggested Fix:** Use Redis-backed rate limiter for production
- **Blocks Production:** No (but limits effectiveness)

### 5. Silent Admin Promotion
- **Component:** `backend/src/middleware/auth.js:62-65`
- **Evidence:** Any user with matching `ADMIN_EMAIL` is silently promoted to admin on every request
- **Impact:** No audit trail for admin role changes
- **Suggested Fix:** Log admin promotion, require explicit admin assignment
- **Blocks Production:** No (but audit gap)

### 6. No Environment Validation
- **Component:** `backend/src/config/runtimeDatabase.js`
- **Evidence:** Warning-only check; app starts even if critical env vars missing
- **Impact:** Runtime crashes instead of startup failures
- **Suggested Fix:** Add Joi/Zod schema validation for env vars at startup
- **Blocks Production:** No (but operational risk)

### 7. Email Service Memory Leak
- **Component:** `backend/src/services/emailService.js:8`
- **Evidence:** `sentMailLog` is unbounded in-memory array
- **Impact:** Memory grows indefinitely in long-running processes
- **Suggested Fix:** Cap array size or remove in production
- **Blocks Production:** No (slow leak)

### 8. SUPABASE_SERVICE_ROLE_KEY Fallback
- **Component:** `backend/src/middleware/auth.js:14`
- **Evidence:** Falls back to `SUPABASE_ANON_KEY` if service role key not set
- **Impact:** Anon key used where service role expected; may bypass RLS incorrectly
- **Suggested Fix:** Require explicit service role key in production
- **Blocks Production:** Depends on Supabase config

---

## Medium

### 9. N+1 Queries
- **Component:** `leaderboardService.js:refreshCompetitiveRanks()`, `progressService.js:getAdminAggregateProgress()`
- **Evidence:** Issues one UPDATE/SELECT per user in a loop
- **Impact:** Performance degrades with many users
- **Suggested Fix:** Batch updates with single SQL statement

### 10. StudentSidebar/AdminSidebar No Mobile Overlay
- **Component:** `StudentSidebar.jsx`, `AdminSidebar.jsx`
- **Evidence:** Always `relative` — no off-canvas behavior on mobile
- **Impact:** Consumes 64-256px permanently on small screens
- **Suggested Fix:** Add mobile overlay like `Sidebar.jsx`

### 11. Vite Build-Time Source Patching
- **Component:** `vite.config.js` — `dailyChallengeAiAuthoringPlugin`
- **Evidence:** Monkey-patches `AdminDailyChallengeModal.jsx` and `AdminDailyChallenge.jsx` at build time
- **Impact:** Fragile; breaks if source file structure changes
- **Suggested Fix:** Refactor to use proper component composition

### 12. Duplicate Migration Numbers
- **Component:** `backend/src/db/migrations/`
- **Evidence:** Two files named `011_*` and two named `012_*`
- **Impact:** Migration ordering confusion
- **Suggested Fix:** Rename to unique sequential numbers

### 13. SQLite/PG Schema Divergence
- **Component:** `backend/src/db/db.js`
- **Evidence:** Different column defaults, types, and indexes between SQLite and PG
- **Impact:** Behavior differences between dev and production
- **Suggested Fix:** Document divergences; align where possible

### 14. No Token Revocation
- **Component:** `backend/src/middleware/auth.js`
- **Evidence:** No token blacklist or revocation mechanism
- **Impact:** Compromised tokens valid for 30 days
- **Suggested Fix:** Add token blacklist (Redis) or short-lived refresh tokens

### 15. Audit Logging Not Enforced
- **Component:** `backend/src/services/auditService.js`
- **Evidence:** Opt-in — relies on each route handler calling `logAction()`
- **Impact:** Critical actions may not be logged
- **Suggested Fix:** Add middleware-based audit logging for write operations

### 16. Code Execution Security Dependency
- **Component:** `backend/src/validation/schemas.js:16`
- **Evidence:** Code execution relies entirely on external Docker runner
- **Impact:** If runner is misconfigured, code runs on host
- **Suggested Fix:** Verify runner isolation; add health checks

---

## Low

### 17. test:frontend Script Misleading
- **Component:** Root `package.json`
- **Evidence:** `test:frontend` runs `npm run build` (not actual tests)
- **Impact:** Confusing for developers
- **Suggested Fix:** Rename to `build:frontend`

### 18. No Structured Logging
- **Component:** All backend services
- **Evidence:** Uses `console.log`/`console.error` — no JSON structured logging
- **Impact:** Harder to parse in production log systems
- **Suggested Fix:** Add structured logging (e.g., pino)

### 19. Hardcoded Daily Challenge Points in Product Rules
- **Component:** `docs/PRODUCT_RULES.md`
- **Evidence:** Point values (50/100/150) documented but implementation uses different values (10/20/30 practice, 50/100/150 DC)
- **Impact:** Documentation inconsistency
- **Suggested Fix:** Update documentation to match implementation

### 20. Unused Legacy Services
- **Component:** `questionSimilarityService.js`
- **Evidence:** Legacy embedding service not used by main pipeline
- **Impact:** Dead code
- **Suggested Fix:** Remove or mark as deprecated

### 21. Scratch Files in Backend Root (Resolved)
- **Component:** `backend/` root directory
- **Evidence:** Scratch and temporary utility scripts previously accumulated in repository root and backend
- **Status:** Resolved in repository cleanup — all obsolete scratch scripts, test dumps, and trace artifacts safely removed


---

## Summary

| Severity | Count | Production Blockers |
|----------|-------|-------------------|
| Critical | 2 | 1 (JWT secret) |
| High | 6 | 0 |
| Medium | 8 | 0 |
| Low | 5 | 0 |
| **Total** | **21** | **1** |

The single production blocker (hardcoded JWT secret) is only dangerous if `NODE_ENV` is misconfigured. With proper environment setup, the application is deployable.
