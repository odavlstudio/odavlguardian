const { JourneyScanner } = require('./src/guardian/journey-scanner');
const { getSaasjJourney } = require('./src/guardian/journey-definitions');

(async () => {
  console.log('Testing journey scanner...');
  const scanner = new JourneyScanner({ timeout: 5000, headless: true });
  const journey = getSaasjJourney();
  console.log('Journey:', journey.name);
  console.log('Starting scan of http://google.com...');
  try {
    const result = await scanner.scan('http://google.com', journey);
    console.log('Result decision:', result.finalDecision);
    console.log('Executed:', result.executedSteps.length);
    console.log('Failed:', result.failedSteps.length);
    if (result.fatalError) {
      console.log('Fatal error:', result.fatalError);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
