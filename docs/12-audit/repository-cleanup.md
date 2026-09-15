# Axly DSA Tracker — Repository Cleanup Report

**Audit Date:** September 15, 2026  
**Scope:** Full-repository safe cleanup of unused, obsolete, temporary, duplicate, accidental, and generated artifacts.  
**Safety Protocol:** Strict read-only audit followed by individual file deletion with zero regressions to active production code, tests, schemas, or migrations.

---

## Executive Summary

| Category | Count | Status |
| :--- | :--- | :--- |
| **Total Tracked Files Before Cleanup** | 1,305 | Audited |
| **Total Files Safely Deleted** | 929 | Deleted & Verified |
| **Active Files Retained** | 376 | Unmodified & Verified |
| **Broken References Introduced** | 0 | Conclusively 0 |
| **Frontend Production Build** | Passing | 19.64s clean build |
| **Backend Test Suite** | 29 passing / 7 failing | Parity with pre-cleanup baseline |

---

## Files Deleted

### 1. Root Temporary & Scratch Source Files (8 files)

1. `ea7524f_modal.jsx`
   - **Reason:** Old snapshot of `AdminQuestionModal.jsx` saved from commit `ea7524f`.
   - **Reference Check:** 0 references across entire codebase.
   - **Why Deletion Is Safe:** Purely an ad-hoc snapshot kept on the root filesystem during modal development.

2. `new_admin.jsx`
   - **Reason:** Scratch draft of Admin Daily Challenge page during redesign.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** The canonical admin page is `frontend/src/pages/AdminDailyChallenge.jsx`.

3. `old.jsx`
   - **Reason:** Obsolete copy of `AdminDailyChallenge.jsx`.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** Dead duplicate file in root.

4. `old_admin.jsx`
   - **Reason:** Obsolete copy of Admin page.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** Dead duplicate file in root.

5. `old_modal.jsx`
   - **Reason:** Obsolete copy of modal component.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** Dead duplicate file in root.

6. `orig_dailyService.js`
   - **Reason:** Temporary backup copy of `backend/src/services/dailyChallengeService.js`.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** Canonical service is active in `backend/src/services/dailyChallengeService.js`.

7. `orig_db.js`
   - **Reason:** Temporary backup copy of `backend/src/db/db.js`.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** Canonical db module is active in `backend/src/db/db.js`.

8. `orig_questionService.js`
   - **Reason:** Temporary backup copy of `backend/src/services/questionService.js`.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** Canonical service is active in `backend/src/services/questionService.js`.

### 2. Root Obsolete Documentation & Scripts (2 files)

9. `original_readme.md`
   - **Reason:** Superseded early draft of README.
   - **Reference Check:** 0 references.
   - **Why Deletion Is Safe:** `README.md` at repository root is the canonical up-to-date documentation.

10. `test-ping.js`
    - **Reason:** Scratch script used once to ping Heroku deployment URL (`dsa-tracker-ee58e15ab674.herokuapp.com`).
    - **Reference Check:** 0 references in package scripts or CI.
    - **Why Deletion Is Safe:** Disposable diagnostic script.

### 3. Root Generated Log Dumps (4 files, ~1.06 MB)

11. `test_centralized2.txt` (297 KB)
    - **Reason:** Raw console output dump from local test execution.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Local terminal output, not code.

12. `test_dc_v2_2.txt` (281 KB)
    - **Reason:** Raw console output dump from local test execution.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Local terminal output, not code.

13. `test_output_dc_v2.txt` (266 KB)
    - **Reason:** Raw console output dump from local test execution.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Local terminal output, not code.

14. `vite_out.txt` (220 KB)
    - **Reason:** Raw console output dump from Vite dev server.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Local build log, not code.

### 4. Playwright Browser Artifacts: `trace_out/` (892 files, ~3.5 MB)

15–906. `trace_out/` directory (892 files)
    - **Reason:** Playwright browser traces, network waterfall JSON, DOM stacks, and hundreds of page thumbnail JPEGs accidentally committed to Git in commit `9835fc2`.
    - **Reference Check:** 0 references across the entire repository.
    - **Why Deletion Is Safe:** Playwright tracing output is strictly a local debugging artifact generated during E2E runs. It should never be stored in Git.

### 5. Scratch Directory: `scratch/` (9 files)

907. `scratch/admin_html.txt`
908. `scratch/admin_test.png`
909. `scratch/check-dev-login.js`
910. `scratch/test-admin-html.js`
911. `scratch/test-admin-login.js`
912. `scratch/test-prod-signup.spec.js`
913. `scratch/test1-failed.png`
914. `scratch/verify-generation.js`
915. `scratch/verify.js`
    - **Reason:** Ad-hoc debugging scripts and failure screenshots created during earlier troubleshooting sessions.
    - **Reference Check:** No external references; only internal cross-references within `scratch/`. Note: `test-prod-signup.spec.js` is properly maintained in `tests/e2e/test-prod-signup.spec.js`.
    - **Why Deletion Is Safe:** Disposable development scratch files.

### 6. Frontend Accidental Diffs & History (7 files)

916. `frontend/diff.txt` (827 B)
917. `frontend/diff2.txt` (647 B)
918. `frontend/diff3.txt` (7.4 KB)
919. `frontend/modal_history.txt` (11.5 KB)
920. `frontend/old_diff.txt` (7.6 KB)
921. `frontend/page_diff.txt` (0 B)
922. `frontend/q_diff.txt` (0 B)
    - **Reason:** Accidental diff output files and git history dumps saved during component editing.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Pure text logs and empty diff files.

### 7. Backend Scratch Scripts & Backups (7 files)

923. `backend/src/db/db.js.backup` (42.7 KB)
    - **Reason:** Redundant `.backup` copy of `backend/src/db/db.js`.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Unused backup file.

924. `backend/scratch-scheduler.js` (262 B)
    - **Reason:** 8-line scratch script testing `getAutomationSettings()`.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Disposable scratch file (documented in `docs/known-issues.md` item 21).

925. `backend/scratch-scheduler2.js` (270 B)
    - **Reason:** 8-line scratch script testing `runDailyScheduledAutomation()`.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Disposable scratch file.

926. `backend/scratch-scheduler3.js` (237 B)
    - **Reason:** 8-line scratch script testing `startAutomationScheduler()`.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Disposable scratch file.

927. `backend/scratch-sqlite.js` (331 B)
    - **Reason:** 10-line scratch script testing `better-sqlite3` in-memory queries.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Disposable scratch file.

928. `backend/scratch.js` (508 B)
    - **Reason:** 15-line scratch script testing `generateDailyChallenge()`.
    - **Reference Check:** Referenced only in audit notes as clutter.
    - **Why Deletion Is Safe:** Disposable scratch file.

929. `backend/scratch_test_insert.js` (932 B)
    - **Reason:** 15-line scratch script testing `INSERT INTO questions` on a copy database.
    - **Reference Check:** 0 references.
    - **Why Deletion Is Safe:** Disposable scratch file.

---

## Files Kept

The following critical categories and specific candidate files were rigorously investigated and retained:

### 1. Root Critical Configuration & Tooling
- `package.json` & `package-lock.json` (root orchestration scripts & devDependencies)
- `.gitignore` (source control filtering)
- `LICENSE`
- `Procfile` (production process manager config)
- `README.md` (canonical root documentation)
- `playwright.config.js` (local E2E testing harness)
- `playwright.production.config.js` (production smoke testing harness)

### 2. Documentation & Visual Assets
- All 50 documentation files in `docs/`, including PRD, architecture, API reference, product rules, and data models.
- All 27 screenshots in `docs/screenshots/` — every screenshot is actively embedded in documentation markdown.
- `scripts/capture-screenshots.js` — canonical automation script that populates `docs/screenshots/`.

### 3. Database Migrations & Seed Data
- All 10 SQL migrations and schema policies in `database/migrations/` and `database/policies/`.
- All seed scripts and production utilities in `backend/scripts/`:
  - `backend/scripts/ensure-postgres-schema.js` (used by `npm run migrate:postgres:schema`)
  - `backend/scripts/migrate-postgres.js` (used by `npm run migrate:postgres`)
  - `backend/scripts/seed-admin.js` (used by `npm run seed:admin`)
  - `backend/scripts/db_inspect.js` & `backend/scripts/db_data_inspect.js` (retained as developer inspection tools)
  - `backend/scripts/inspect_all_problems.js` & `backend/scripts/inspect_hints_quality.js` (retained for problem verification)

### 4. Tests & Fixtures
- All 10 test suites in `tests/e2e/`, including `production-smoke.spec.js`, `daily_challenge_lifecycle.spec.js`, and `braveFixture.js`.
- All 36 Jest test suites in `backend/tests/` and `backend/src/services/__tests__/`.
- None of the test suites were modified, weakened, or skipped.

---

## Uncertain Files (Retained Safely)

The following files were identified during scanning but retained because their utility as developer inspection or standalone verification tools cannot be conclusively ruled out:

1. `backend/inspect_schema.js`
   - *Status:* Retained.
   - *Rationale:* Useful developer CLI tool to print SQLite table definitions and row counts.
2. `backend/test_ai_validation.js`
   - *Status:* Retained.
   - *Rationale:* Standalone script testing AI generation with strict sandbox validation.
3. `backend/test_novelty_real.js`
   - *Status:* Retained.
   - *Rationale:* Standalone diagnostic script for testing novelty detection against live LLM APIs.
4. `backend/test_real_generation.js`
   - *Status:* Retained.
   - *Rationale:* Standalone diagnostic script for end-to-end question generation.
5. `frontend/test_starter_code.js`
   - *Status:* Retained.
   - *Rationale:* Standalone unit verification of starter code generator logic.

---

## Post-Cleanup Verification

1. **Broken Reference Scan:** Scanned 376 remaining tracked files. Zero broken imports, zero missing script targets, zero missing file paths.
2. **Frontend Production Build:**
   ```bash
   npm --prefix frontend run build
   # ✓ 2076 modules transformed.
   # ✓ built in 19.64s (0 errors, clean output)
   ```
3. **Backend Test Suite:** Ran full Jest suite (`jest --runInBand --forceExit`). Confirmed 29 suites passing, 7 failing matching the exact pre-cleanup baseline (pre-existing timeouts, question count assertions, and strict sandbox validations). Zero test failures caused by cleanup.
4. **Git Tree Cleanliness:** No untracked junk created; only explicit deletions staged.

---

## Recommendations for Future Maintenance

1. **Add `trace_out/` and `scratch/` to `.gitignore`:**
   To prevent accidental commits of local Playwright traces or temporary scratch scripts, add `trace_out/` and `scratch/` to the root `.gitignore`.
2. **Consolidate Backend Inspection Scripts:**
   Move `backend/inspect_schema.js`, `backend/test_real_generation.js`, and `backend/test_novelty_real.js` into `backend/scripts/` under a consistent CLI naming convention (e.g., `scripts/inspect-*.js`).
