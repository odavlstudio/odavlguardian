const http = require('http');
const path = require('path');
const fs = require('fs');
const { startBackgroundRunner, createSchedule, saveState } = require('./src/guardian/live-scheduler');

// Start a minimal HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
    <html>
      <head><title>Landing</title></head>
      <body>
        <h1>Contact Us</h1>
        <a href="/contact">Contact</a>
      </body>
    </html>`);
});

server.listen(0, async () => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}`;

  try {
    // Clean scheduler state
    saveState({ schedules: [], runner: null });

    // Create a schedule with very short interval (0.02 min ~= 1.2s)
    const sched = createSchedule({ url, preset: 'landing', intervalMinutes: 0.02 });
    const runner = startBackgroundRunner();
    if (!runner || !runner.pid) throw new Error('Runner did not start');

    // Wait up to ~6 seconds for a tick and a baseline write
    const start = Date.now();
    let success = false;
    while (Date.now() - start < 6000) {
      const state = JSON.parse(fs.readFileSync(path.join(require('os').homedir(), '.odavl-guardian', 'scheduler', 'schedules.json'), 'utf-8'));
      const entry = (state.schedules || []).find(x => x.id === sched.id);
      if (entry && entry.lastRunAt) {
        success = true;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!success) throw new Error('Live run did not execute within expected time');
    console.log('✅ Live scheduler integration test passed');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Integration test failed:', err.message);
    server.close();
    process.exit(1);
  }
});
