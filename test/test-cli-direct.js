const http = require('http');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple server
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (req.url === '/') {
        res.writeHead(200);
        res.end(`<html><body><h1>Test</h1><button>Sign Up</button></body></html>`);
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
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));

  console.log(`Testing CLI against ${baseUrl}`);
  console.log(`Output dir: ${outputDir}\n`);

  const result = spawnSync(process.execPath, [
    'bin/guardian.js',
    'journey-scan',
    baseUrl,
    '--preset', 'saas',
    '--out', outputDir
  ], {
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024
  });

  console.log('STDOUT:');
  console.log(result.stdout || '(empty)');
  console.log('\nSTDERR:');
  console.log(result.stderr || '(empty)');
  console.log(`\nExit code: ${result.status}`);
  console.log(`Error: ${result.error ? result.error.message : 'none'}`);

  if (fs.existsSync(path.join(outputDir, 'report.json'))) {
    console.log('\n✓ report.json exists');
  }

  server.close();
})();
