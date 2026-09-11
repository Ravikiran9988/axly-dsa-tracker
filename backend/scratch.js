require('dotenv').config();
const { generateDailyChallenge } = require('./src/services/aiDailyChallengeService');
const { getRepository } = require('./src/db/repositoryFactory');

async function runTest() {
  try {
    const result = await generateDailyChallenge({
      title: 'Merge K Sorted Linked Lists',
      topic: 'Heap',
      pattern: 'K-Way Merge',
      difficulty: 'Hard'
    });
    console.log(JSON.stringify(result.data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

runTest();
