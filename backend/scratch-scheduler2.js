const { runDailyScheduledAutomation } = require('./src/services/dailyChallengeAutomationService');

(async () => {
  try {
    const result = await runDailyScheduledAutomation();
    console.log(result);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
})();
