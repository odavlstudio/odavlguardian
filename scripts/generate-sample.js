/*
 * Generate a real Guardian sample artifact bundle for the website demo.
 * Usage: npm run sample:generate
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const cliPath = path.join(root, 'bin', 'guardian.js');
const tmpDir = path.join(root, 'website', 'public', 'sample-artifacts-tmp');
const outputDir = path.join(root, 'website', 'public', 'sample-artifacts');
const zipPath = path.join(root, 'website', 'public', 'sample-artifacts.zip');
const targetUrl = process.env.GUARDIAN_SAMPLE_URL || 'https://example.com';

const rimraf = (p) => fs.rmSync(p, { recursive: true, force: true });
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

async function createZip(fromDir, toZipPath) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(toZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(fromDir, false);
    archive.finalize();
  });
}

function runGuardian() {
  const args = [
    'reality',
    '--url',
    targetUrl,
    '--artifacts',
    tmpDir,
    '--no-trace',
    '--no-screenshots',
    '--max-pages',
    '5',
    '--max-depth',
    '2',
    '--timeout',
    '15000'
  ];

  console.log(`> node ${path.relative(process.cwd(), cliPath)} ${args.join(' ')}`);
  const result = spawnSync('node', [cliPath, ...args], {
    stdio: 'inherit',
    cwd: root
  });

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`Guardian run failed with exit code ${result.status}`);
  }

  if (result.status === 1) {
    console.warn('Guardian returned exit code 1 (FRICTION/DO_NOT_LAUNCH); continuing because artifacts were produced.');
  }
}

async function main() {
  rimraf(tmpDir);
  rimraf(outputDir);
  rimraf(zipPath);

  runGuardian();

  const dirs = fs
    .readdirSync(tmpDir)
    .map((name) => ({ name, stat: fs.statSync(path.join(tmpDir, name)) }))
    .filter((entry) => entry.stat.isDirectory() && entry.name !== 'latest')
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (!dirs.length) {
    throw new Error('No Guardian run directory produced');
  }

  const runId = dirs[0].name;
  const runPath = path.join(tmpDir, runId);

  ensureDir(path.dirname(outputDir));
  fs.cpSync(runPath, outputDir, { recursive: true });

  await createZip(outputDir, zipPath);

  rimraf(tmpDir);

  console.log(`Sample artifacts ready: ${outputDir}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Download bundle: ${zipPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
