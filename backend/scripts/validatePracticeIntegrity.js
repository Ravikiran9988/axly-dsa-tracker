const fs = require('fs');
const path = require('path');
const { loadPracticeProblems } = require('../src/db/practiceSeed');

const EXPECTED_TOPIC_COUNTS = {
  arrays: 12,
  strings: 10,
  hashing: 8,
  'two-pointers-sliding-window': 10,
  stack: 8,
  'binary-search': 8,
  trees: 12,
  'dynamic-programming': 12
};

const PATTERNS_FILE = path.join(__dirname, '../src/db/data/patterns.json');
const APPROVED_PATTERNS = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8')).map(p => p.id);

function runFullPracticeAudit() {
  console.log('=== STARTING COMPLETE AUDIT OF 80 PRACTICE QUESTIONS ===\n');

  const problems = loadPracticeProblems();
  const errors = [];
  const warnings = [];

  if (problems.length !== 80) {
    errors.push(`Expected 80 problems, found ${problems.length}`);
  }

  const ids = new Set();
  const slugs = new Set();
  const topicCounts = {};

  problems.forEach((p, idx) => {
    const num = idx + 1;
    // 1. Basic identifiers
    if (!p.id || typeof p.id !== 'string') errors.push(`[#${num}] Missing or invalid ID`);
    if (ids.has(p.id)) errors.push(`[#${num}] Duplicate ID: ${p.id}`);
    ids.add(p.id);

    if (!p.slug || typeof p.slug !== 'string') errors.push(`[#${num} ${p.id}] Missing or invalid slug`);
    if (slugs.has(p.slug)) errors.push(`[#${num} ${p.id}] Duplicate slug: ${p.slug}`);
    slugs.add(p.slug);

    if (!p.title || typeof p.title !== 'string') errors.push(`[#${num} ${p.id}] Missing or invalid title`);

    // 2. Topic & Pattern
    if (!EXPECTED_TOPIC_COUNTS[p.topic]) {
      errors.push(`[#${num} ${p.id}] Invalid topic: ${p.topic}`);
    }
    topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;

    if (!APPROVED_PATTERNS.includes(p.pattern)) {
      errors.push(`[#${num} ${p.id}] Invalid pattern: ${p.pattern}`);
    }

    // 3. Difficulty
    const diff = String(p.difficulty || '').toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      errors.push(`[#${num} ${p.id}] Invalid difficulty: ${p.difficulty}`);
    }

    // 4. Description & Constraints
    if (!p.description || p.description.length < 15) {
      errors.push(`[#${num} ${p.id}] Description too short or missing`);
    }

    // 5. Examples & Test Cases
    if (!Array.isArray(p.examples) || p.examples.length === 0) {
      errors.push(`[#${num} ${p.id}] Missing examples`);
    }

    if (!Array.isArray(p.testCases) || p.testCases.length < 3) {
      errors.push(`[#${num} ${p.id}] Needs >= 3 test cases; found ${p.testCases?.length || 0}`);
    } else {
      const hasEdgeOrHidden = p.testCases.some(tc => tc.hidden);
      if (!hasEdgeOrHidden) {
        warnings.push(`[#${num} ${p.id}] Has no hidden/edge test case flagged`);
      }

      p.testCases.forEach((tc, tcIdx) => {
        if (tc.input === undefined || tc.input === null || String(tc.input).trim() === '') {
          errors.push(`[#${num} ${p.id} TC#${tcIdx + 1}] Empty test case input`);
        }
        if (tc.expectedOutput === undefined || tc.expectedOutput === null || String(tc.expectedOutput).trim() === '') {
          errors.push(`[#${num} ${p.id} TC#${tcIdx + 1}] Empty expected output`);
        }
      });
    }
  });

  // Check topic counts
  for (const [topic, expected] of Object.entries(EXPECTED_TOPIC_COUNTS)) {
    const actual = topicCounts[topic] || 0;
    if (actual !== expected) {
      errors.push(`Topic count mismatch for ${topic}: expected ${expected}, found ${actual}`);
    }
  }

  console.log(`Audited: ${problems.length} problems`);
  console.log(`Topic Distribution:`, topicCounts);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.error('\n--- AUDIT ERRORS ---');
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log('\n✅ ALL 80 PRACTICE QUESTIONS PASSED STATIC & DATA INTEGRITY AUDIT!');
  }
}

if (require.main === module) {
  runFullPracticeAudit();
}

module.exports = { runFullPracticeAudit };
