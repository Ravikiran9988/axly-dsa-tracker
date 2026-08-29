# Axly DSA Tracker — Database Backup, Restore & Disaster Recovery Guide

## 1. Overview

Axly DSA Tracker utilizes **PostgreSQL (Supabase)** in production and a compatible **SQLite adapter** for local development and integration testing.

This guide outlines standard operational procedures for data safety, automated daily backups, point-in-time recovery (PITR), and migration rollbacks.

---

## 2. Production Backup Procedures (PostgreSQL / Supabase)

### Automated Daily Snapshots
- Managed via Supabase Automated Physical Backups (retained for 30 days).
- Point-In-Time Recovery (PITR) is active for continuous write-ahead log (WAL) archiving.

### Manual Logical Backup (pg_dump)
To take a manual point-in-time logical dump prior to major migrations or upgrades:

```bash
# Export full database schema and data
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="axly_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Table-Specific Dumps (High-Value Data)
```bash
# Dump core domain tables
pg_dump "$DATABASE_URL" \
  --table=users \
  --table=questions \
  --table=question_test_cases \
  --table=question_versions \
  --table=submissions \
  --table=submission_score_audit \
  --table=practice_progress \
  --format=custom \
  --file="axly_core_tables.dump"
```

---

## 3. Restore Procedures

### Restoring from pg_dump Custom Archive
```bash
# Restore to target database with clean schema
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$TARGET_DATABASE_URL" \
  "axly_backup_YYYYMMDD_HHMMSS.dump"
```

### Dry-Run Verification
Before applying to production, restore the dump to a staging environment and verify row counts:
```bash
psql "$STAGING_DATABASE_URL" -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM questions; SELECT COUNT(*) FROM submissions;"
```

---

## 4. Migration Rollback Policy

1. **Non-Destructive Migrations First**: Schema changes must be backward-compatible (adding columns as nullable or with defaults, creating indexes `CONCURRENTLY`).
2. **Transactional SQL Migrations**: All migration files in `database/migrations/` should be tested inside explicit transactions (`BEGIN ... COMMIT`).
3. **Rollback Scripts**: Every migration must have a corresponding reverse operation recorded.
4. **Data Fixes**: Score recalculations or streak restorations must execute through the audited services (`scoringService.js`, `submission_score_audit`).

---

## 5. SQLite to PostgreSQL Migration

For migrating historical records from a local SQLite development environment to PostgreSQL:
```bash
node backend/scripts/migrate-sqlite-to-postgres.js --dry-run
node backend/scripts/migrate-sqlite-to-postgres.js
```
The script performs pre-flight connectivity checks, transactional batch insertion, table row count validation, and sequence re-synchronization.
