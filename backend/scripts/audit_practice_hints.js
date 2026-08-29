const { loadPracticeProblems } = require('../src/db/practiceSeed');
const { getRepository } = require('../src/db/repositoryFactory');
const { ensurePracticeSchema } = require('../src/db/practiceSchema');

ensurePracticeSchema();
const repo = getRepository();
const probs = loadPracticeProblems();

console.log('=== AUDIT OF ALL 80 PRACTICE PROBLEMS ===\n');

let validCount = 0;
const errors = [];
const tableRows = [];

for (const p of probs) {
  const hints = p.hints;
  const count = Array.isArray(hints) ? hints.length : 0;
  let status = 'COMPLETE';

  if (!Array.isArray(hints)) {
    status = 'MISSING';
    errors.push(`${p.id}: hints is not an array`);
  } else if (hints.length < 2 || hints.length > 3) {
    status = 'INVALID_COUNT';
    errors.push(`${p.id}: hint count is ${hints.length} (expected 2-3)`);
  } else {
    const set = new Set(hints);
    if (set.size !== hints.length) {
      status = 'DUPLICATE_HINTS';
      errors.push(`${p.id}: contains duplicate hints`);
    }
    for (let i = 0; i < hints.length; i++) {
      if (!hints[i] || typeof hints[i] !== 'string' || !hints[i].trim()) {
        status = 'EMPTY_HINT';
        errors.push(`${p.id}: hint ${i + 1} is empty`);
      }
    }
  }

  if (status === 'COMPLETE') validCount++;

  tableRows.push({
    id: p.id,
    title: p.title,
    topic: p.topic,
    difficulty: p.difficulty,
    hintsCount: count,
    status
  });
}

// Print tabular audit
console.log('ID | Title | Topic | Difficulty | Hints Count | Status');
console.log('---|---|---|---|---|---');
tableRows.forEach(r => {
  console.log(`${r.id} | ${r.title} | ${r.topic} | ${r.difficulty} | ${r.hintsCount} | ${r.status}`);
});

console.log('\n==================================================');
console.log(`TOTAL AUDITED: ${probs.length}`);
console.log(`VALID / COMPLETE: ${validCount} / ${probs.length}`);
console.log(`ERRORS: ${errors.length}`);
if (errors.length > 0) {
  console.log('Error details:', errors);
  process.exit(1);
} else {
  console.log('80/80 problems have valid hints.');
}
