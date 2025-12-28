const http = require('http');
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple test server
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');
      
      if (req.url === '/') {
        res.writeHead(200);
        res.end(`
          <html>
            <body>
              <h1>Homepage</h1>
              <a href="/page2">Link to Page 2</a>
              <a href="/page3">Link to Page 3</a>
            </body>
          </html>
        `);
      } else if (req.url === '/page2') {
        res.writeHead(200);
        res.end('<html><body><h1>Page 2</h1></body></html>');
      } else if (req.url === '/page3') {
        res.writeHead(200);
        res.end('<html><body><h1>Page 3</h1></body></html>');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

(async () => {
  console.log('🧪 MVP Test Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 1: Basic crawl
    console.log('📋 Test 1: Basic crawl and report generation');
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
    
    const result = spawnSync(process.execPath, [
      'bin/guardian.js',
      '--url', baseUrl,
      '--max-pages', '5',
      '--max-depth', '2',
      '--artifacts', artifactsDir
    ], { 
      encoding: 'utf8', 
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(result.stdout);
    if (result.stderr) console.error('STDERR:', result.stderr);

    // Check exit code (deterministic mapping: OBSERVED=0, PARTIAL=1, INSUFFICIENT_DATA=2)
    assert.ok(
      result.status === 0 || result.status === 1 || result.status === 2,
      `Exit code should be 0, 1, or 2, got ${result.status}`
    );
    console.log(`✅ Exit code: ${result.status}`);

    // Check report was created
    const runDirs = fs.readdirSync(artifactsDir)
      .filter(d => d.startsWith('run-'))
      .sort()
      .reverse();
    
    assert.ok(runDirs.length > 0, 'No run directory created');
    const runDir = runDirs[0];
    console.log(`✅ Run directory created: ${runDir}`);

    // Check report.json exists
    const reportPath = path.join(artifactsDir, runDir, 'report.json');
    assert.ok(fs.existsSync(reportPath), 'report.json not found');
    console.log(`✅ report.json exists`);

    // Parse report
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    // Validate report structure
    assert.ok(report.summary, 'summary missing');
    assert.ok(report.summary.visitedPages >= 1, 'Should visit at least 1 page');
    assert.ok(report.summary.coverage >= 0, 'Coverage should be >= 0');
    assert.ok(report.finalJudgment, 'finalJudgment missing');
    assert.ok(report.finalJudgment.decision, 'decision missing');
    
    console.log(`✅ Report structure valid`);
    console.log(`   - Visited: ${report.summary.visitedPages} pages`);
    console.log(`   - Coverage: ${report.summary.coverage}%`);
    console.log(`   - Decision: ${report.finalJudgment.decision}`);
    console.log(`   - Confidence: ${report.confidence.level}`);

    // Test 2: Decision logic — new vocabulary
    console.log('\n📋 Test 2: Decision logic');
    const allowedDecisions = ['OBSERVED', 'PARTIAL', 'INSUFFICIENT_DATA'];
    assert.ok(allowedDecisions.includes(report.finalJudgment.decision), `Unexpected decision: ${report.finalJudgment.decision}`);
    console.log('✅ Decision uses allowed vocabulary');

    // For basic crawl-only run (no flows), expect INSUFFICIENT_DATA
    assert.strictEqual(report.finalJudgment.decision, 'INSUFFICIENT_DATA', 'Crawl-only run should yield INSUFFICIENT_DATA');
    console.log('✅ Crawl-only → INSUFFICIENT_DATA');

    // Test 3: Confidence levels — should remain LOW for crawl-only
    console.log('\n📋 Test 3: Confidence level calculation');
    
    let expectedLevel = 'LOW';
    
    assert.strictEqual(
      report.confidence.level,
      expectedLevel,
      `Confidence level mismatch`
    );
    console.log(`✅ Confidence level: ${report.confidence.level} (correct for ${report.summary.coverage}% coverage)`);

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    server.close();
  }
})();
