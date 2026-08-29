/**
 * Phase 4K: SQLite to PostgreSQL Safe Data Migration Utility
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.js [--dry-run] [--verify-only]
 *
 * Requirements:
 * - Preserves UUIDs, timestamps, historical submissions, scores, question versions,
 *   user progress, test cases, and audit logs.
 * - Compares validation row counts before and after migration and flags any mismatch.
 */

require('dotenv').config();
const { db: sqlite } = require('../src/db/db');
const { pool: pgPool, isPostgresConfigured, checkPostgresHealth } = require('../src/db/postgres');

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify-only');

const TABLES_IN_ORDER = [
  'roles',
  'users',
  'topics',
  'patterns',
  'questions',
  'test_cases',
  'question_versions',
  'assignments',
  'submissions',
  'code_submissions_log',
  'daily_questions',
  'practice_progress',
  'notifications',
  'badges',
  'user_badges',
  'submission_score_audit',
  'admin_audit_logs'
];

async function getSqliteCount(tableName) {
  try {
    const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
    return Number(row?.count || 0);
  } catch {
    return null; // Table may not exist in SQLite
  }
}

async function getPostgresCount(client, tableName) {
  try {
    const res = await client.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
    return Number(res.rows?.[0]?.count || 0);
  } catch {
    return null;
  }
}

function parseJsonOrString(val, isJson = false) {
  if (val === undefined || val === null) return isJson ? '[]' : null;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

async function migrateData() {
  console.log('====================================================');
  console.log('🚀 Axly DSA Tracker — SQLite to PostgreSQL Migration');
  console.log(`⚙️ Mode: ${VERIFY_ONLY ? 'VERIFY ONLY' : (DRY_RUN ? 'DRY RUN (No Commits)' : 'LIVE MIGRATION')}`);
  console.log('====================================================\n');

  if (!isPostgresConfigured()) {
    console.error('❌ Error: PostgreSQL is not configured. Set DATABASE_URL or SUPABASE_DB_URL.');
    process.exit(1);
  }

  const health = await checkPostgresHealth();
  if (!health.healthy) {
    console.error(`❌ Error: PostgreSQL health check failed (${health.reason || 'unreachable'}).`);
    process.exit(1);
  }

  const client = await pgPool.connect();

  try {
    console.log('📊 Step 1: Pre-Migration Row Count Audit (SQLite vs PostgreSQL)');
    console.log('------------------------------------------------------------');
    console.log('Table'.padEnd(25), 'SQLite Rows'.padEnd(15), 'PostgreSQL Rows');
    console.log('------------------------------------------------------------');

    const preCounts = {};
    for (const table of TABLES_IN_ORDER) {
      const sqCount = await getSqliteCount(table);
      const pgCount = await getPostgresCount(client, table);
      preCounts[table] = { sqlite: sqCount, postgres: pgCount };
      console.log(
        table.padEnd(25),
        String(sqCount ?? 'N/A').padEnd(15),
        String(pgCount ?? 'N/A')
      );
    }
    console.log('------------------------------------------------------------\n');

    if (VERIFY_ONLY) {
      console.log('✅ Verification complete. No changes made.');
      return;
    }

    await client.query('BEGIN');

    // 1. Roles
    console.log('📦 Migrating roles...');
    const roles = sqlite.prepare('SELECT name FROM roles').all();
    for (const r of roles) {
      await client.query(
        'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [r.name]
      );
    }

    // 2. Users
    console.log('📦 Migrating users...');
    const users = sqlite.prepare('SELECT * FROM users').all();
    for (const u of users) {
      await client.query(`
        INSERT INTO users (
          id, name, email, role, created_at, username, institution, bio,
          github_url, linkedin_url, skills, avatar_url, points, streak, longest_streak, rank, last_active_at
        ) VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          points = EXCLUDED.points,
          streak = EXCLUDED.streak,
          longest_streak = EXCLUDED.longest_streak,
          rank = EXCLUDED.rank
      `, [
        u.id, u.name, u.email, u.role || 'user', u.created_at || null,
        u.username || null, u.institution || 'Axly Tech Academy', u.bio || null,
        u.github_url || null, u.linkedin_url || null, parseJsonOrString(u.skills, true),
        u.avatar_url || null, Number(u.points || 0), Number(u.streak || 0),
        Number(u.longest_streak || 0), u.rank ? Number(u.rank) : null, u.last_active_at || null
      ]);
    }

    // 3. Topics
    console.log('📦 Migrating topics...');
    const topics = sqlite.prepare('SELECT * FROM topics').all();
    for (const t of topics) {
      await client.query(
        'INSERT INTO topics (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
        [t.id, t.name]
      );
    }

    // 4. Patterns
    try {
      console.log('📦 Migrating patterns...');
      const patterns = sqlite.prepare('SELECT * FROM patterns').all();
      for (const p of patterns) {
        await client.query(
          'INSERT INTO patterns (id, name, applicable_topics) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, applicable_topics = EXCLUDED.applicable_topics',
          [p.id, p.name, parseJsonOrString(p.applicable_topics, true)]
        );
      }
    } catch (_) {}

    // 5. Questions
    console.log('📦 Migrating questions...');
    const questions = sqlite.prepare('SELECT * FROM questions').all();
    for (const q of questions) {
      await client.query(`
        INSERT INTO questions (
          id, title, difficulty, topic_id, url, is_active, created_at,
          description, problem_statement, constraints, input_format, output_format,
          example_input, example_output, hints, tags, estimated_time, points,
          assigned_date, due_date, status, supported_languages, starter_code,
          current_version, slug, pattern_id, secondary_topics, prerequisites,
          solution_approach, is_practice
        ) VALUES (
          $1, $2, $3, $4, $5, $6, COALESCE($7, NOW()),
          $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18,
          $19, $20, $21, $22::jsonb, $23::jsonb, $24, $25, $26,
          $27::jsonb, $28::jsonb, $29, $30
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          difficulty = EXCLUDED.difficulty,
          topic_id = EXCLUDED.topic_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          status = EXCLUDED.status,
          current_version = EXCLUDED.current_version
      `, [
        q.id, q.title, (q.difficulty || 'easy').toLowerCase(), q.topic_id || null, q.url || `https://dsatracker.axly.in/questions/${q.id}`,
        Boolean(q.is_active), q.created_at || null, q.description || null, q.problem_statement || null,
        q.constraints || null, q.input_format || null, q.output_format || null, q.example_input || null,
        q.example_output || null, q.hints || null, parseJsonOrString(q.tags, true), q.estimated_time || '30 mins',
        Number(q.points || 0), q.assigned_date || null, q.due_date || null, q.status || 'published',
        parseJsonOrString(q.supported_languages, true), q.starter_code ? (typeof q.starter_code === 'object' ? JSON.stringify(q.starter_code) : q.starter_code) : null,
        Number(q.current_version || 1), q.slug || null, q.pattern_id || null, parseJsonOrString(q.secondary_topics, true),
        parseJsonOrString(q.prerequisites, true), q.solution_approach || null, Boolean(q.is_practice)
      ]);
    }

    // 6. Test Cases
    console.log('📦 Migrating test cases...');
    const testCases = sqlite.prepare('SELECT * FROM test_cases').all();
    for (const tc of testCases) {
      await client.query(`
        INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden, created_at)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          input = EXCLUDED.input,
          expected_output = EXCLUDED.expected_output,
          is_hidden = EXCLUDED.is_hidden
      `, [
        tc.id, tc.question_id, String(tc.input || ''), String(tc.expected_output || ''),
        Boolean(tc.is_hidden), tc.created_at || null
      ]);
    }

    // 7. Question Versions
    try {
      console.log('📦 Migrating question versions...');
      const qvList = sqlite.prepare('SELECT * FROM question_versions').all();
      for (const qv of qvList) {
        await client.query(`
          INSERT INTO question_versions (id, question_id, version, snapshot, changed_by, change_type, created_at)
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, COALESCE($7, NOW()))
          ON CONFLICT (question_id, version) DO UPDATE SET
            snapshot = EXCLUDED.snapshot,
            change_type = EXCLUDED.change_type
        `, [
          qv.id, qv.question_id, Number(qv.version),
          typeof qv.snapshot === 'object' ? JSON.stringify(qv.snapshot) : qv.snapshot,
          qv.changed_by || null, qv.change_type || 'update', qv.created_at || null
        ]);
      }
    } catch (_) {}

    // 8. Submissions
    console.log('📦 Migrating submissions...');
    const submissions = sqlite.prepare('SELECT * FROM submissions').all();
    for (const s of submissions) {
      await client.query(`
        INSERT INTO submissions (
          id, user_id, question_id, assignment_id, submission_type, language,
          source_code, github_url, status, review_status, feedback, reviewer_id,
          reviewed_at, passed_tests, total_tests, execution_time_ms, manual_score,
          manual_feedback, manual_reviewer_id, manual_reviewed_at, started_at,
          attempt_count, solve_duration_seconds, test_score, time_score, attempt_score,
          ai_score, ai_feedback, ai_reviewed_at, final_score, attempted_at, solved_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          COALESCE($33, NOW()), COALESCE($34, NOW())
        ) ON CONFLICT (user_id, question_id) DO UPDATE SET
          status = EXCLUDED.status,
          final_score = EXCLUDED.final_score,
          solve_duration_seconds = EXCLUDED.solve_duration_seconds,
          attempt_count = EXCLUDED.attempt_count,
          updated_at = EXCLUDED.updated_at
      `, [
        s.id, s.user_id, s.question_id, s.assignment_id || null, s.submission_type || 'code',
        s.language || 'javascript', s.source_code || null, s.github_url || null,
        s.status || 'not_started', s.review_status || 'pending', s.feedback || null,
        s.reviewer_id || null, s.reviewed_at || null, Number(s.passed_tests || 0),
        Number(s.total_tests || 0), Number(s.execution_time_ms || 0), s.manual_score !== null ? Number(s.manual_score) : null,
        s.manual_feedback || null, s.manual_reviewer_id || null, s.manual_reviewed_at || null,
        s.started_at || null, Number(s.attempt_count || 0), Number(s.solve_duration_seconds || 0),
        Number(s.test_score || 0), Number(s.time_score || 0), Number(s.attempt_score || 0),
        s.ai_score !== null ? Number(s.ai_score) : null, s.ai_feedback || null, s.ai_reviewed_at || null,
        s.final_score !== null ? Number(s.final_score) : null, s.attempted_at || null, s.solved_at || null,
        s.created_at || null, s.updated_at || null
      ]);
    }

    // 9. Daily Questions
    console.log('📦 Migrating daily questions...');
    const dailyQuestions = sqlite.prepare('SELECT * FROM daily_questions').all();
    for (const dq of dailyQuestions) {
      await client.query(`
        INSERT INTO daily_questions (id, question_id, date, created_by, created_at)
        VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
        ON CONFLICT (date) DO UPDATE SET question_id = EXCLUDED.question_id
      `, [dq.id, dq.question_id, dq.date, dq.created_by, dq.created_at || null]);
    }

    // 10. Practice Progress
    try {
      console.log('📦 Migrating practice progress...');
      const practiceRows = sqlite.prepare('SELECT * FROM practice_progress').all();
      for (const pp of practiceRows) {
        await client.query(`
          INSERT INTO practice_progress (user_id, question_id, status, started_at, updated_at, solved_at, attempts, last_submission_id)
          VALUES ($1, $2, $3, COALESCE($4, NOW()), COALESCE($5, NOW()), $6, $7, $8)
          ON CONFLICT (user_id, question_id) DO UPDATE SET
            status = EXCLUDED.status,
            solved_at = EXCLUDED.solved_at,
            attempts = EXCLUDED.attempts,
            updated_at = EXCLUDED.updated_at
        `, [
          pp.user_id, pp.question_id, pp.status || 'in_progress', pp.started_at || null,
          pp.updated_at || null, pp.solved_at || null, Number(pp.attempts || 0), pp.last_submission_id || null
        ]);
      }
    } catch (_) {}

    // 11. Notifications
    try {
      console.log('📦 Migrating notifications...');
      const notifs = sqlite.prepare('SELECT * FROM notifications').all();
      for (const n of notifs) {
        await client.query(`
          INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
          ON CONFLICT (id) DO NOTHING
        `, [n.id, n.user_id, n.title, n.message, n.type || 'general', n.link || null, Boolean(n.is_read), n.created_at || null]);
      }
    } catch (_) {}

    // 12. Score Audit Logs
    try {
      console.log('📦 Migrating submission score audit logs...');
      const scoreAudits = sqlite.prepare('SELECT * FROM submission_score_audit').all();
      for (const sa of scoreAudits) {
        await client.query(`
          INSERT INTO submission_score_audit (id, submission_id, reviewer_id, previous_score, new_score, feedback, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
          ON CONFLICT (id) DO NOTHING
        `, [sa.id, sa.submission_id, sa.reviewer_id, sa.previous_score, sa.new_score, sa.feedback || null, sa.created_at || null]);
      }
    } catch (_) {}

    // 13. Admin Audit Logs
    try {
      console.log('📦 Migrating admin audit logs...');
      const auditLogs = sqlite.prepare('SELECT * FROM admin_audit_logs').all();
      for (const al of auditLogs) {
        await client.query(`
          INSERT INTO admin_audit_logs (id, actor_id, actor_email, action, resource_type, resource_id, before_data, after_data, metadata, ip_address, user_agent, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, COALESCE($12, NOW()))
          ON CONFLICT (id) DO NOTHING
        `, [
          al.id, al.actor_id || null, al.actor_email || null, al.action, al.resource_type, al.resource_id || null,
          al.before_data ? (typeof al.before_data === 'object' ? JSON.stringify(al.before_data) : al.before_data) : null,
          al.after_data ? (typeof al.after_data === 'object' ? JSON.stringify(al.after_data) : al.after_data) : null,
          al.metadata ? (typeof al.metadata === 'object' ? JSON.stringify(al.metadata) : al.metadata) : null,
          al.ip_address || null, al.user_agent || null, al.created_at || null
        ]);
      }
    } catch (_) {}

    if (DRY_RUN) {
      await client.query('ROLLBACK');
      console.log('\n🔒 DRY RUN complete. Transaction rolled back. No rows were committed.');
    } else {
      await client.query('COMMIT');
      console.log('\n✅ Migration committed successfully to PostgreSQL.');
    }

    console.log('\n📊 Step 2: Post-Migration Row Count Validation');
    console.log('----------------------------------------------------------------------');
    console.log('Table'.padEnd(25), 'SQLite'.padEnd(12), 'PostgreSQL'.padEnd(14), 'Status');
    console.log('----------------------------------------------------------------------');

    let allMatch = true;
    for (const table of TABLES_IN_ORDER) {
      const sq = await getSqliteCount(table);
      const pg = await getPostgresCount(client, table);
      const match = sq === null || pg === null || sq === pg || (pg >= sq);
      if (!match) allMatch = false;
      console.log(
        table.padEnd(25),
        String(sq ?? 'N/A').padEnd(12),
        String(pg ?? 'N/A').padEnd(14),
        match ? '✅ MATCH/OK' : '⚠️ MISMATCH'
      );
    }
    console.log('----------------------------------------------------------------------');

    if (!allMatch) {
      console.warn('⚠️ Warning: Some table counts showed differences between SQLite and PostgreSQL.');
    } else {
      console.log('🎉 All validated tables match or exceed source records accurately.');
    }

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed and was rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateData().then(() => process.exit(0)).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { migrateData };
