const { loadPracticeProblems } = require('../src/db/practiceSeed');
const probs = loadPracticeProblems();

console.log('List of all 80 problems:');
probs.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.id}] "${p.title}" | Topic: ${p.topic} | Pattern: ${p.pattern} | Difficulty: ${p.difficulty}`);
  console.log(`   Approach: ${p.solutionApproach}`);
});
