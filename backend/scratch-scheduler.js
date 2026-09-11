const { getAutomationSettings } = require('./src/services/dailyChallengeAutomationService');

(async () => {
  try {
    const settings = await getAutomationSettings();
    console.log(settings);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
})();
