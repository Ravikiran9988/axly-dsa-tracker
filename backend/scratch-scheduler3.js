const { startAutomationScheduler } = require('./src/services/dailyChallengeAutomationService');

(async () => {
  try {
    startAutomationScheduler();
    console.log("Scheduler started");
  } catch(e) {
    console.error(e);
  }
})();
