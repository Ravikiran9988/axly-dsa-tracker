const fs = require('fs');
const path = require('path');
const { pool } = require('./postgres');

const LEGACY_BASELINE = '023_question_embeddings.sql';

async function initPostgresSchema(pgPool = pool) {
  if (!pgPool) {
    throw new Error('PostgreSQL pool is not configured');
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const client = await pgPool.connect();
  let lockAcquired = false;

  try {
    // Prevent two release processes from applying migrations concurrently.
    await client.query("SELECT pg_advisory_lock(hashtext('axly-dsa-tracker:postgres-migrations'))");
    lockAcquired = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const appliedResult = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map(row => row.version));

    // Existing Axly databases predate migration tracking. Baseline the known
    // historical migrations once, then let the normal ledger apply new ones.
    // A fresh database cannot enter this path because migration 001 is recorded
    // immediately after it succeeds.
    if (applied.size === 0) {
      const coreSchemaResult = await client.query(`
        SELECT
          EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'users'
          ) AS has_users,
          EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'questions'
          ) AS has_questions
      `);

      const hasLegacyCoreSchema =
        coreSchemaResult.rows[0].has_users && coreSchemaResult.rows[0].has_questions;

      if (hasLegacyCoreSchema) {
        const historicalFiles = migrationFiles.filter(file => file <= LEGACY_BASELINE);
        for (const file of historicalFiles) {
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
            [file]
          );
          applied.add(file);
        }
        console.log(`  Baseline detected existing database through ${LEGACY_BASELINE}.`);
      }
    }

    for (const file of migrationFiles) {
      if (applied.has(file)) continue;

      const sqlPath = path.join(migrationsDir, file);
      const ddlSql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`  Applying migration: ${file}...`);

      // Each migration owns its SQL transaction when it contains BEGIN/COMMIT.
      // Record it only after PostgreSQL confirms successful execution.
      await client.query(ddlSql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [file]
      );
    }

    console.log('✅ Supabase PostgreSQL schema initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL schema:', err.message);
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext('axly-dsa-tracker:postgres-migrations'))");
      } catch (unlockError) {
        console.error('⚠️ Failed to release PostgreSQL migration lock:', unlockError.message);
      }
    }
    client.release();
  }
}

module.exports = { initPostgresSchema };
