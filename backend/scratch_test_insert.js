const db = require('better-sqlite3')('data/axly_dsa_migration_copy.db');

try {
  db.prepare(`
    INSERT INTO questions (
        id, title, slug, url, difficulty, topic_id, pattern_id,
        estimated_time, points, description, problem_statement, constraints,
        input_format, output_format, example_input, example_output, examples,
        hints, tags, solution_approach, editorial, complexity, starter_code,
        reference_solution, supported_languages, is_practice, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    'test-id', 'Test Title', 'test-title', 'internal://test-title', 'easy', null, null,
    30, 100, 'desc', 'statement', 'constraints',
    'input', 'output', 'in', 'out', '[]',
    '[]', '[]', null, null, null, null,
    null, '["javascript"]', 'admin-id'
  );
  console.log("Success");
} catch (e) {
  console.error(e.message);
}
