const http = require('http');
const { JourneyScanner } = require('./src/guardian/journey-scanner');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <h1>Welcome</h1>
        <a href="/signup">Sign Up</a>
      </body>
    </html>`);
});

server.listen(0, async () => {
  try {
    const port = server.address().port;
    const scanner = new JourneyScanner({ timeout: 5000, headless: true });
    const journey = {
      name: 'Test',
      preset: 'saas',
      steps: [
        { id: 'nav', name: 'Navigate', action: 'navigate', target: '/' },
        { id: 'cta', name: 'Find CTA', action: 'find_cta' }
      ]
    };
    
    const result = await scanner.scan(`http://127.0.0.1:${port}`, journey);
    
    console.log('✅ Decision:', result.finalDecision);
    console.log('✅ Stability Score:', result.stability?.runStabilityScore);
    console.log('✅ Metrics:', result.stability?.metrics);
    console.log('✅ Steps executed:', result.executedSteps.length);
    console.log('✅ Stability Report:', {
      score: result.stability.runStabilityScore,
      assessment: result.stability.assessment,
      stepsWithRetries: result.stability.metrics.stepsWithRetries,
      failedSteps: result.stability.metrics.failedSteps
    });
    
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    server.close();
    process.exit(1);
  }
});
