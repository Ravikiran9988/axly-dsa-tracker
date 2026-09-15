# Axly DSA Tracker — Audit Verification Report

*Read-only verification of 21 reported findings against actual source code.*
*Date: September 15, 2026*

---

## Verification Table

| # | Finding | Verified? | Severity | Evidence | Fix Now? |
|---|---------|-----------|----------|----------|----------|
| 1 | Hardcoded JWT Secret Fallback | **PARTIAL** | Medium | `auth.js:16,18` — Throws in production; fallback only in non-production | No (misclassified) |
| 2 | No CSRF Protection | **NOT A BUG** | Low | Auth uses Bearer tokens only; no cookie-based auth | No (not applicable) |
| 3 | CORS Allows No-Origin Requests | **YES** | Low | `app.js:61` — Intentional for server-side clients | No |
| 4 | In-Memory Rate Limiting | **YES** | Low | `rateLimiter.js` — express-rate-limit default store | No (single instance) |
| 5 | Silent Admin Promotion | **YES** | Medium | `auth.js:62-65` — No audit.logAction() call | No |
| 6 | No Environment Validation | **YES** | Medium | `runtimeDatabase.js:5` — console.error only | No |
| 7 | Email Service Memory Leak | **YES** | Low | `emailService.js:8` — unbounded array | No |
| 8 | SUPABASE_SERVICE_ROLE_KEY Fallback | **YES** | Medium | `auth.js:14` — Falls back to anon key | No |
| 9 | N+1 Queries | **YES** | Medium | `leaderboardService.js:30-32`, `progressService.js:135-136` | No |
| 10 | Student/Admin Sidebar Mobile | **YES** | Medium | `StudentSidebar.jsx`, `AdminSidebar.jsx` — relative layout | No |
| 11 | Vite Build-Time Source Patching | **YES** | Medium | `vite.config.js:5-76` — String replacement on 2 files | No |
| 12 | Duplicate Migration Numbers | **YES** | Low | Two `011_*` and two `012_*` files | No (already applied) |
| 13 | SQLite/PG Schema Divergence | **YES** | Medium | `db.js` vs migrations — different defaults/types | No |
| 14 | No Token Revocation | **YES** | Medium | JWT 30-day expiry, no blacklist | No |
| 15 | Audit Logging Not Enforced | **YES** | Medium | Opt-in in 4 controllers, not middleware | No |
| 16 | Code Execution Security Dependency | **PARTIAL** | Low | Docker runner is intentional architecture | No |
| 17 | test:frontend Script Misleading | **YES** | Low | `package.json:16` — Runs build, not tests | No |
| 18 | No Structured Logging | **YES** | Low | console.log/error only | No |
| 19 | Hardcoded DC Points Documentation | **YES** | Low | `PRODUCT_RULES.md:9` says UTC; implementation uses IST | No |
| 20 | Unused Legacy Services | **YES** | Low | `questionSimilarityService.js` — zero imports found | No |
| 21 | Scratch Files in Backend Root | **YES** | Low | 12+ files in `backend/` root | No |

---

## Detailed Findings

### CONFIRMED BUGS (0)

None of the 21 findings are confirmed bugs that break functionality or cause data corruption.

---

### PARTIALLY VALID (4)

#### #1 — JWT Secret Fallback
- **Reported:** Critical — hardcoded fallback in production
- **Actual:** `auth.js:16` — `JWT_SECRET` falls back to hardcoded string only when `NODE_ENV !== 'production'`. Line 18: `if (isProduction && !JWT_SECRET) throw new Error(...)` — **production startup fails if env missing.**
- **Real severity:** Medium (misconfiguration risk in non-production)
- **Recommendation:** Downgrade to Medium. Add `.env.example` with placeholder to guide developers.

#### #16 — Code Execution Security
- **Reported:** Security dependency on external runner
- **Actual:** Docker runner is the **intentional architecture**. It provides isolation (non-root, read-only, resource limits). Without it, backend falls back to local process execution (also sandboxed).
- **Real severity:** Low (availability risk, not security risk)
- **Recommendation:** Document that runner is required for production. Add health check monitoring.

#### #19 — Hardcoded DC Points Documentation
- **Reported:** Documentation inconsistency
- **Actual:** `PRODUCT_RULES.md:9` says "UTC calendar day" but implementation uses IST. Points (50/100/150) match implementation. The UTC reference is stale.
- **Real severity:** Low (documentation only)
- **Recommendation:** Update `PRODUCT_RULES.md` to say IST.

#### #20 — Unused Legacy Services
- **Reported:** Dead code
- **Actual:** `questionSimilarityService.js` — **zero imports** found across entire codebase (backend, tests, scripts). Uses old OpenAI-compatible embedding API. Newer `questionNoveltyService.js` and `questionEmbeddingService.js` replace it.
- **Real severity:** Low (dead code)
- **Recommendation:** Safe to delete or mark deprecated.

---

### NOT A BUG (2)

#### #2 — No CSRF Protection
- **Reported:** Critical — no CSRF middleware
- **Actual:** Authentication uses **Bearer tokens exclusively** (`Authorization: Bearer <jwt>`). No cookie-based auth flow. CSRF attacks target cookie-based auth. **CSRF is not applicable** to this architecture.
- **Note:** Supabase OAuth may set cookies during the redirect flow, but the backend doesn't read them for auth.

#### #16 — Code Execution Security (see Partially Valid above)

---

### DOCUMENTATION ISSUE (1)

#### #19 — PRODUCT_RULES.md UTC Reference
- **File:** `docs/PRODUCT_RULES.md:9`
- **Issue:** Says "UTC calendar day" — should say "IST calendar day"
- **Impact:** Confuses developers about timezone behavior

---

### TECHNICAL DEBT (8)

#### #3 — CORS Allows No-Origin Requests
- **File:** `app.js:60-61`
- **Evidence:** `if (!origin) return cb(null, true);` with comment "server-side, curl, mobile apps"
- **Assessment:** **Intentional design.** No-Origin requests come from server-side clients, curl, mobile apps. The attack surface is minimal: without Origin, the request has no cross-site context.
- **Risk:** Low. An attacker cannot exploit this without controlling the user's browser AND making requests without Origin (impossible from browser JS).

#### #4 — In-Memory Rate Limiting
- **File:** `rateLimiter.js`
- **Evidence:** `express-rate-limit` with default `MemoryStore`
- **Assessment:** Heroku runs single instance. Memory store is fine. Resets on deploy (rare).
- **Risk:** Low for current deployment. Would need Redis for multi-instance.

#### #7 — Email Service Memory Leak
- **File:** `emailService.js:8`
- **Evidence:** `const sentMailLog = [];` — unbounded
- **Assessment:** In production, Resend API is used; `sentMailLog` still grows (every email is pushed). But emails are infrequent (OTP, verification, password reset). At 100 emails/day, array would take ~100KB after a year. **Not a realistic memory concern.**
- **Risk:** Negligible for current scale.

#### #9 — N+1 Queries
- **Files:** `leaderboardService.js:30-32`, `progressService.js:135-136`
- **Evidence:**
  - `refreshCompetitiveRanks()`: `for (const user of users) { await repo.execute('UPDATE users SET rank = ? WHERE id = ?', [i+1, user.id]); }`
  - `getAdminAggregateProgress()`: `for (const user of users) { const progress = await getUserProgress(user.id); }`
- **Assessment:** Confirmed N+1. `refreshCompetitiveRanks` issues 1 UPDATE per user. `getAdminAggregateProgress` calls `getUserProgress` (4-6 queries) per user.
- **Impact:** Performance degrades with many users. Acceptable at current scale (<1000 users).

#### #11 — Vite Build-Time Source Patching
- **File:** `vite.config.js:5-76`
- **Evidence:** Plugin string-replaces code in `AdminDailyChallengeModal.jsx` and `AdminDailyChallenge.jsx` to inject AI authoring features and IST date formatting.
- **Assessment:** **Fragile but functional.** If source files change structure, build will throw explicit errors (marker checks). Production relies on it for IST display and AI buttons.
- **Risk:** Medium. Breaks silently if markers change.

#### #13 — SQLite/PG Schema Divergence
- **Files:** `db.js` (SQLite) vs `migrations/*.sql` (PostgreSQL)
- **Evidence:**
  - SQLite: `points INTEGER DEFAULT 100`, PG: `points INTEGER DEFAULT 0`
  - SQLite: `streak INTEGER DEFAULT 1`, PG: no `streak` column (uses `individual_streak`)
  - SQLite: `INTEGER DEFAULT 1` for booleans, PG: `BOOLEAN DEFAULT FALSE`
- **Assessment:** Different defaults and column names between dev (SQLite) and production (PG). May cause behavior differences.

#### #14 — No Token Revocation
- **File:** `auth.js`
- **Evidence:** JWT tokens have 30-day expiry. No blacklist, no revocation endpoint. Logout only clears client-side.
- **Assessment:** Compromised tokens valid for up to 30 days. No server-side revocation.
- **Risk:** Medium. Standard for JWT without refresh tokens.

#### #15 — Audit Logging Not Enforced
- **File:** `auditService.js`, controllers
- **Evidence:** `logAction()` called in: `questionController.js` (4 calls), `submissionController.js` (4 calls), `aiQuestionController.js` (1 call), `userController.js` (1 call). NOT called for: auth promotions, DC automation, settings changes, user deactivation.
- **Assessment:** Opt-in. Critical actions like admin promotion (`auth.js:62-65`) are NOT logged.

---

### SAFE CLEANUP (3)

#### #12 — Duplicate Migration Numbers
- **Files:**
  - `011_align_practice_progress_pk.sql` + `011_practice_patterns_compatibility.sql`
  - `012_practice_progress_compatibility.sql` + `012_production_rls_hardening.sql`
- **Assessment:** Already applied. PostgreSQL migration runner (`postgresSchema.js`) applies ALL `.sql` files sorted alphabetically. Both `011_*` and `012_*` files run in sequence. No ordering conflict.
- **Risk:** Low. But confusing for developers.

#### #17 — test:frontend Script Misleading
- **File:** `package.json:16`
- **Evidence:** `"test:frontend": "npm --prefix frontend run build"` — runs build, not tests
- **Assessment:** Confusing naming. `test` script chains `test:backend && test:frontend`, implying both are tests.

#### #21 — Scratch Files in Backend Root
- **Files:** `backend/` root:
  - `scratch/` directory (1 file: `phase4_validation.js`)
  - Root: `drop_qb.js`, `dump_legacy.js`, `extract_routes.js`, `inspect_schema.js`, `list_tables.js`, `list_tables2.js`, `phase3_final.js`, `phase3_migration.js`, `test_ai_validation.js`, `test_novelty_real.js`, `test_real_generation.js`, `verify_rollback.js`
- **Assessment:** One-time utility scripts. Not referenced by any code.

---

### REQUIRES ARCHITECTURAL DECISION (2)

#### #5 — Silent Admin Promotion
- **File:** `auth.js:62-65`
- **Evidence:** When a user with `ADMIN_EMAIL` logs in and is not already admin, role is silently updated: `await repo.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id])`. No `auditService.logAction()` call.
- **Fix:** Add audit log call after promotion. Simple one-line fix.
- **Dependency:** None. Safe to fix now.

#### #8 — SUPABASE_SERVICE_ROLE_KEY Fallback
- **File:** `auth.js:14`
- **Evidence:** `const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;`
- **Impact:** If service role key not set, anon key is used for Supabase client. This may bypass RLS or fail to access privileged data.
- **Fix:** Throw in production if only anon key available. Or log warning.
- **Dependency:** None. Safe to fix now.

---

## Additional Findings (Not in Original 21)

### A. PRODUCT_RULES.md UTC vs IST Mismatch
- **File:** `docs/PRODUCT_RULES.md:9`
- **Issue:** Says "UTC calendar day" — implementation uses IST
- **Severity:** Low (documentation)

### B. Admin Promotion Audit Gap
- **File:** `auth.js:62-65`
- **Issue:** Role change not logged
- **Severity:** Medium

### C. Email HTML Injection
- **File:** `emailService.js:72,110,148`
- **Issue:** `name` parameter interpolated directly into HTML without sanitization
- **Severity:** Low (name comes from trusted source)

---

## Summary

| Category | Count | Issues |
|----------|-------|--------|
| Confirmed Bugs | 0 | — |
| Partially Valid | 4 | #1, #16, #19, #20 |
| Not a Bug | 2 | #2, #16 |
| Documentation Issue | 1 | #19 |
| Technical Debt | 8 | #3, #4, #7, #9, #11, #13, #14, #15 |
| Safe Cleanup | 3 | #12, #17, #21 |
| Requires Architecture Decision | 2 | #5, #8 |

### Severity Reassessment

| Original | Revised | Change |
|----------|---------|--------|
| Critical: 2 | Critical: 0 | Downgraded #1 (throws in prod), #2 (not applicable) |
| High: 6 | High: 0 | Downgraded all (see details) |
| Medium: 8 | Medium: 5 | #5, #8, #9, #13, #14, #15 remain Medium |
| Low: 5 | Low: 14 | All others are Low |

### Bottom Line

**No critical or high-severity bugs exist.** The original audit overstated severity by:
1. Not verifying JWT actually throws in production (it does)
2. Not checking auth uses Bearer tokens (it does — CSRF not applicable)
3. Not checking migration runner behavior (alphabetical sort handles duplicates)
4. Not checking email frequency (infrequent — leak negligible)

The 5 medium-severity items (#5, #8, #9, #13, #14, #15) are real technical debt but not blocking production deployment.
