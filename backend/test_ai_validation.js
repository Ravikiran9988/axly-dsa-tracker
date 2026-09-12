const { generateDailyChallenge } = require('./src/services/aiDailyChallengeService');

async function testGeneration() {
  try {
    console.log("Starting strictly validated AI generation...");
    const result = await generateDailyChallenge({
      title: 'Shortest Path with Alternating Colors',
      topic: 'Graphs',
      difficulty: 'medium',
      skipSandbox: false
    });
    console.log("SUCCESS! Generated challenge:");
    console.log(JSON.stringify(result.data.title, null, 2));
  } catch (err) {
    console.error("GENERATION FAILED OR REJECTED BY VALIDATOR:", err.message);
  }
}

testGeneration();
