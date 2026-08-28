# Phase 4 — PostgreSQL Runtime Migration

This document tracks the service-by-service migration from the legacy synchronous SQLite runtime to PostgreSQL.

## 4A — Repository foundation
- Repository boundary and PostgreSQL pool exist.
- SQLite remains local/test-only during migration.

## 4B — Auth and Users
- Migrate user reads/writes, authentication persistence, profile updates and user gamification persistence to the async repository contract.
- Preserve existing API response shapes and authorization behavior.

## 4C — Questions and Daily Challenge
- Migrate question CRUD, test cases, question versions, daily challenge selection and practice state.
- Preserve UTC challenge semantics and version snapshots.

## 4D — Submissions, Scoring and Gamification
- Migrate submission creation/evaluation persistence, scoring, streaks and leaderboard updates.
- Preserve canonical leaderboard ordering.

## 4E — Progress and Analytics
- Migrate progress, history, analytics and recommendation persistence.

## 4F — Admin, Reviews and Notifications
- Migrate admin operations, AI/manual review state, audit records and notifications.

## 4G — SQLite removal
- Search for all runtime imports/direct calls to `better-sqlite3` and `db.prepare`/`db.transaction`.
- Remove SQLite from production runtime.
- Keep a deliberate isolated adapter only if required for local/test fixtures.

## 4H — Verification
- Run unit, integration and migration checks against PostgreSQL.
- Verify auth, question lifecycle, Daily Challenge, submissions, scoring, leaderboard, practice, admin and notifications end-to-end.
- Do not declare production cutover until PostgreSQL tests pass.
