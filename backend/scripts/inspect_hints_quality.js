const { loadPracticeProblems } = require('../src/db/practiceSeed');
const probs = loadPracticeProblems();

console.log('=== DETAILED HINT QUALITY AUDIT ===\n');

for (let i = 0; i < probs.length; i++) {
  const p = probs[i];
  console.log(`[${i+1}/80] ${p.id} | ${p.title} (${p.topic} / ${p.pattern} / ${p.difficulty})`);
  console.log('  Approach:', p.solutionApproach);
  p.hints.forEach((h, idx) => console.log(`  Hint ${idx+1}:`, h));
  console.log('');
}
