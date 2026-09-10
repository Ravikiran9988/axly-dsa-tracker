require('dotenv').config();
const { generateQuestion } = require('./src/services/aiQuestionService');
const { generateDailyChallenge } = require('./src/services/aiDailyChallengeService');

async function runTests() {
  console.log('--- Testing Question Bank Generation ---');
  try {
    const qBankResult = await generateQuestion({ topic: 'Arrays', difficulty: 'easy', count: 1 });
    console.log('Question Bank Result:');
    console.log('- Title:', qBankResult.title);
    console.log('- Starter Code keys:', Object.keys(qBankResult.starter_code || {}));
    console.log('- Test Cases count:', qBankResult.test_cases?.length);
    console.log('- Reference Solution keys:', Object.keys(qBankResult.reference_solution || {}));
    console.log('- Function signature:', qBankResult.function_signature);
  } catch (err) {
    console.error('Question Bank Error:', err.message);
  }

  console.log('\\n--- Testing Daily Challenge Generation ---');
  try {
    // For daily challenge, we need the DB mocked or connected if it checks duplicates.
    // In our case we probably won't be able to connect to the DB if we don't have a sqlite file or mysql connection strings.
    // Wait, the backend uses a local SQLite or MySQL DB?
    // Let's just mock `checkDuplicateChallenge` on `aiDailyChallengeService` using jest, or run it through jest.
  } catch (err) {
    console.error('Daily Challenge Error:', err.message);
  }
}

runTests().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
