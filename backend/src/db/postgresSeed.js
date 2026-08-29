const fs = require('fs');
const path = require('path');
const { pool } = require('./postgres');
const { loadPracticeProblems } = require('./practiceSeed');

const DATA = path.join(__dirname, 'data');

async function seedPostgresDatabase(pgPool = pool) {
  if (!pgPool) {
    throw new Error('PostgreSQL pool is not configured');
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // 1. Roles
    await client.query(`
      INSERT INTO roles (name) VALUES ('admin'), ('user'), ('mentor')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2. Topics & Patterns
    const topics = JSON.parse(fs.readFileSync(path.join(DATA, 'topics.json'), 'utf8'));
    const patterns = JSON.parse(fs.readFileSync(path.join(DATA, 'patterns.json'), 'utf8'));

    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      await client.query(`
        INSERT INTO topics (id, name, order_index)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index
      `, [t.id, t.name, i + 1]);
    }

    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[i];
      await client.query(`
        INSERT INTO patterns (id, name, topic_id, order_index)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, topic_id = EXCLUDED.topic_id, order_index = EXCLUDED.order_index
      `, [p.id, p.name, p.applicableTopics?.[0] || null, i + 1]);
    }

    // 3. Curated 80 Practice Problems
    const problems = loadPracticeProblems();
    for (const p of problems) {
      const hintsJson = JSON.stringify(p.hints || []);
      const tagsJson = JSON.stringify([p.topic, p.pattern, 'Practice V1']);
      const constraintsStr = Array.isArray(p.constraints) ? p.constraints.join('\n') : String(p.constraints || '');
      const exampleInput = p.examples?.[0]?.input || '';
      const exampleOutput = p.examples?.[0]?.output || '';

      await client.query(`
        INSERT INTO questions (
          id, title, slug, difficulty, points, estimated_time, topic_id, pattern_id,
          description, problem_statement, constraints, input_format, output_format,
          example_input, example_output, hints, tags, solution_approach, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18, TRUE
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          difficulty = EXCLUDED.difficulty,
          topic_id = EXCLUDED.topic_id,
          pattern_id = EXCLUDED.pattern_id,
          description = EXCLUDED.description,
          problem_statement = EXCLUDED.problem_statement,
          constraints = EXCLUDED.constraints,
          example_input = EXCLUDED.example_input,
          example_output = EXCLUDED.example_output,
          hints = EXCLUDED.hints,
          tags = EXCLUDED.tags,
          solution_approach = EXCLUDED.solution_approach,
          is_active = TRUE
      `, [
        p.id, p.title, p.slug, String(p.difficulty).toLowerCase(),
        p.difficulty === 'hard' ? 30 : p.difficulty === 'medium' ? 20 : 10,
        p.estimatedMinutes || 30, p.topic, p.pattern,
        p.description, p.description, constraintsStr,
        p.inputFormat || '', p.outputFormat || '',
        exampleInput, exampleOutput, hintsJson, tagsJson, p.solutionApproach || ''
      ]);

      await client.query('DELETE FROM question_test_cases WHERE question_id = $1', [p.id]);
      if (Array.isArray(p.testCases)) {
        for (let i = 0; i < p.testCases.length; i++) {
          const tc = p.testCases[i];
          await client.query(`
            INSERT INTO question_test_cases (id, question_id, input, expected_output, is_hidden)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            `${p.id}-tc-${i + 1}`,
            p.id,
            String(tc.input || ''),
            String(tc.expectedOutput || ''),
            Boolean(tc.hidden)
          ]);
        }
      }
    }

    // 4. Default Badges
    const badges = [
      { id: 'badge-first-solve', name: 'First Problem Solved', description: 'Solved your very first DSA problem', icon: 'zap', threshold_type: 'problems', threshold_value: 1 },
      { id: 'badge-streak-7', name: '7-Day Streak', description: 'Solved Daily Challenges for 7 consecutive days', icon: 'flame', threshold_type: 'streak', threshold_value: 7 },
      { id: 'badge-streak-30', name: 'Monthly Champion', description: 'Maintained a 30-day streak', icon: 'trophy', threshold_type: 'streak', threshold_value: 30 },
      { id: 'badge-points-500', name: '500 Points Club', description: 'Accumulated 500 competitive points', icon: 'award', threshold_type: 'points', threshold_value: 500 }
    ];

    for (const b of badges) {
      await client.query(`
        INSERT INTO badges (id, name, description, icon, threshold_type, threshold_value)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          threshold_type = EXCLUDED.threshold_type,
          threshold_value = EXCLUDED.threshold_value
      `, [b.id, b.name, b.description, b.icon, b.threshold_type, b.threshold_value]);
    }

    await client.query('COMMIT');
    console.log(`✅ Supabase PostgreSQL seeded successfully: 80 Practice problems, topics, patterns, and badges.`);
    return { success: true, count: problems.length };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Failed to seed PostgreSQL database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedPostgresDatabase };
