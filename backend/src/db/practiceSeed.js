const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { db } = require('./db');
const { ensurePracticeSchema } = require('./practiceSchema');

const DATA = path.join(__dirname, 'data');
const EXPECTED_COUNTS = {
  arrays: 12,
  strings: 10,
  hashing: 8,
  'two-pointers-sliding-window': 10,
  stack: 8,
  'binary-search': 8,
  trees: 12,
  'dynamic-programming': 12
};

function readBatch(n) {
  const filePath = path.join(DATA, `practice-batch-${n}.json.gz.b64`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Practice batch file missing: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  return JSON.parse(zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8'));
}

function loadPracticeProblems() {
  const problems = [1, 2, 3, 4].flatMap(readBatch);
  if (problems.length !== 80) {
    throw new Error(`Practice V1 seed must contain exactly 80 problems; found ${problems.length}`);
  }

  const ids = new Set();
  const slugs = new Set();
  const counts = {};

  for (const p of problems) {
    if (ids.has(p.id)) throw new Error(`Duplicate Practice problem id: ${p.id}`);
    if (slugs.has(p.slug)) throw new Error(`Duplicate Practice problem slug: ${p.slug}`);
    ids.add(p.id);
    slugs.add(p.slug);
    counts[p.topic] = (counts[p.topic] || 0) + 1;

    const diff = String(p.difficulty || '').toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      throw new Error(`Invalid difficulty for ${p.id}: ${p.difficulty}`);
    }
    if (!Array.isArray(p.testCases) || p.testCases.length < 3) {
      throw new Error(`Less than 3 tests for ${p.id}`);
    }
  }

  for (const [topic, count] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[topic] !== count) {
      throw new Error(`Practice V1 topic ${topic} expected ${count}, found ${counts[topic] || 0}`);
    }
  }

  return problems;
}

function seedPracticeProblems() {
  ensurePracticeSchema();
  const topics = JSON.parse(fs.readFileSync(path.join(DATA, 'topics.json'), 'utf8'));
  const patterns = JSON.parse(fs.readFileSync(path.join(DATA, 'patterns.json'), 'utf8'));
  const problems = loadPracticeProblems();

  const topicSet = new Set(topics.map(t => t.id));
  const patternMap = new Map(patterns.map(p => [p.id, p]));

  const tx = db.transaction(() => {
    topics.forEach(t => {
      const existing = db.prepare('SELECT id FROM topics WHERE id = ? OR name = ?').get(t.id, t.name);
      if (!existing) {
        db.prepare('INSERT INTO topics (id, name) VALUES (?, ?)').run(t.id, t.name);
      } else if (existing.id !== t.id || existing.name !== t.name) {
        db.prepare('UPDATE topics SET id = ?, name = ? WHERE id = ?').run(t.id, t.name, existing.id);
      }
    });

    const pi = db.prepare(`
      INSERT OR REPLACE INTO patterns (id, name, applicable_topics) VALUES (?, ?, ?)
    `);
    patterns.forEach(p => pi.run(p.id, p.name, JSON.stringify(p.applicableTopics)));

    const up = db.prepare(`
      INSERT INTO questions (
        id, title, difficulty, topic_id, url, description, problem_statement, constraints,
        example_input, example_output, hints, tags, estimated_time, points, status,
        is_active, slug, pattern_id, secondary_topics, prerequisites, solution_approach, is_practice
      ) VALUES (
        @id, @title, @difficulty, @topic_id, @url, @description, @description, @constraints,
        @example_input, @example_output, @hints, @tags, @estimated_time, 0, 'published',
        1, @slug, @pattern_id, @secondary_topics, @prerequisites, @solution_approach, 1
      ) ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        difficulty = excluded.difficulty,
        topic_id = excluded.topic_id,
        url = excluded.url,
        description = excluded.description,
        problem_statement = excluded.problem_statement,
        constraints = excluded.constraints,
        example_input = excluded.example_input,
        example_output = excluded.example_output,
        hints = excluded.hints,
        tags = excluded.tags,
        estimated_time = excluded.estimated_time,
        points = 0,
        status = 'published',
        is_active = TRUE,
        slug = excluded.slug,
        pattern_id = excluded.pattern_id,
        secondary_topics = excluded.secondary_topics,
        prerequisites = excluded.prerequisites,
        solution_approach = excluded.solution_approach,
        is_practice = TRUE
    `);

    const dt = db.prepare('DELETE FROM test_cases WHERE question_id = ?');
    const it = db.prepare('INSERT INTO test_cases (id, question_id, input, expected_output, is_hidden) VALUES (?, ?, ?, ?, ?)');

    for (const p of problems) {
      if (!topicSet.has(p.topic)) throw new Error(`Invalid topic ${p.topic}`);
      if (!patternMap.has(p.pattern) || !patternMap.get(p.pattern).applicableTopics.includes(p.topic)) {
        throw new Error(`Invalid pattern ${p.pattern} for ${p.id}`);
      }

      up.run({
        id: p.id,
        title: p.title,
        difficulty: String(p.difficulty).toLowerCase(),
        topic_id: p.topic,
        url: p.url || '',
        description: p.description,
        constraints: Array.isArray(p.constraints) ? p.constraints.join('\n') : String(p.constraints || ''),
        example_input: p.examples?.[0]?.input || '',
        example_output: p.examples?.[0]?.output || '',
        hints: JSON.stringify(p.hints || []),
        tags: JSON.stringify([p.topic, p.pattern, 'Practice V1']),
        estimated_time: `${p.estimatedMinutes} mins`,
        slug: p.slug,
        pattern_id: p.pattern,
        secondary_topics: JSON.stringify(p.secondaryTopics || []),
        prerequisites: JSON.stringify(p.prerequisites || []),
        solution_approach: p.solutionApproach || ''
      });

      dt.run(p.id);
      p.testCases.forEach((tc, i) => {
        it.run(`${p.id}-tc-${i + 1}`, p.id, String(tc.input), String(tc.expectedOutput), Boolean(tc.hidden))
      });
    }
  });

  tx();
  return problems.length;
}

if (require.main === module) {
  const count = seedPracticeProblems();
  console.log(`Seeded ${count} Practice V1 problems.`);
}

module.exports = { seedPracticeProblems, loadPracticeProblems };
