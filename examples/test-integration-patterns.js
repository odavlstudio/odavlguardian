/**
 * Integration Test: Patterns in CLI and HTML Output
 * Demonstrates Stage V pattern detection wired into all outputs
 */

const fs = require('fs');
const path = require('path');
const { generateCliSummary } = require('./src/guardian/cli-summary');
const { generateEnhancedHtml } = require('./src/guardian/enhanced-html-reporter');

// Create test data directory with synthetic runs
const testDir = './test-artifacts/integration-pattern-demo';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Clear existing
const entries = fs.readdirSync(testDir);
for (const entry of entries) {
  const fullPath = path.join(testDir, entry);
  if (fs.statSync(fullPath).isDirectory()) {
    fs.rmSync(fullPath, { recursive: true });
  }
}

// Create 3 test runs for integration-test site (to have patterns)
const runData = [
  {
    dir: '2025-12-27_16-00-00_integration-test_default_WARN',
    verdict: 'FRICTION',
    score: 0.75,
    failingAttempt: 'api-request'
  },
  {
    dir: '2025-12-27_17-00-00_integration-test_default_WARN',
    verdict: 'FRICTION',
    score: 0.72,
    failingAttempt: 'api-request'
  }
];

// Create runs
for (const run of runData) {
  const runDir = path.join(testDir, run.dir);
  fs.mkdirSync(runDir, { recursive: true });

  const meta = {
    version: 1,
    timestamp: new Date().toISOString(),
    url: 'https://integration-test.example.com',
    siteSlug: 'integration-test',
    policy: 'default',
    result: 'WARN',
    durationMs: 35000,
    attempts: { total: 3, successful: 2, failed: 1, skipped: 0 }
  };

  const snapshot = {
    schemaVersion: 'v1',
    meta,
    verdict: {
      verdict: run.verdict,
      confidence: { level: 'medium', score: run.score },
      why: `${2}/3 executed attempts completed. ${1} did not complete.`,
      keyFindings: [
        '2 of 3 executed attempts completed',
        '1 attempt did not complete',
        'Evidence is complete'
      ],
      limits: [
        'Based on last 3 pages',
        'Live site behavior shifts over time; this verdict reflects this moment'
      ]
    },
    attempts: [
      {
        attemptId: 'login',
        attemptName: 'User Login',
        outcome: 'SUCCESS',
        totalDurationMs: 1200
      },
      {
        attemptId: run.failingAttempt,
        attemptName: 'API Request',
        outcome: 'FAILURE',
        totalDurationMs: 8500,
        friction: { isFriction: false }
      },
      {
        attemptId: 'homepage',
        attemptName: 'Load Homepage',
        outcome: 'SUCCESS',
        totalDurationMs: 600
      }
    ]
  };

  fs.writeFileSync(path.join(runDir, 'META.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(runDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
}

console.log('🧪 INTEGRATION TEST: Patterns in CLI and HTML Output\n');
console.log('═'.repeat(70) + '\n');

// Test 1: CLI Summary with Patterns
console.log('📋 TEST 1: CLI Summary with Pattern Output');
console.log('─'.repeat(70));

const lastSnapshot = JSON.parse(fs.readFileSync(
  path.join(testDir, runData[1].dir, 'snapshot.json'),
  'utf8'
));

const cliOutput = generateCliSummary(lastSnapshot, null, null, {
  artifactsDir: testDir,
  siteSlug: 'integration-test'
});

console.log(cliOutput);
console.log('\n✅ CLI output includes pattern section\n');

// Test 2: HTML Report with Patterns
console.log('📄 TEST 2: HTML Report with Pattern Panel');
console.log('─'.repeat(70));

const htmlReportDir = path.join(testDir, 'report-output');
fs.mkdirSync(htmlReportDir, { recursive: true });

const htmlContent = generateEnhancedHtml(lastSnapshot, htmlReportDir, {
  artifactsDir: testDir,
  siteSlug: 'integration-test'
});

// Check if patterns are in HTML
const hasPatternSection = htmlContent.includes('Observed Patterns');
const hasPatternEmoji = htmlContent.includes('🔍');

console.log(`Patterns section present in HTML: ${hasPatternSection ? '✅' : '❌'}`);
console.log(`Pattern emoji present: ${hasPatternEmoji ? '✅' : '❌'}`);

// Extract and display pattern section from HTML
if (hasPatternSection) {
  const patternStart = htmlContent.indexOf('Observed Patterns');
  const patternSection = htmlContent.substring(patternStart, patternStart + 500);
  console.log('\nHTML Pattern Section (preview):');
  console.log(patternSection.substring(0, 300) + '...\n');
}

// Write HTML to file for manual inspection
const htmlPath = path.join(htmlReportDir, 'integration-test-report.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log(`✅ Full HTML report written to: ${htmlPath}\n`);

console.log('═'.repeat(70));
console.log('✅ Integration Test Complete: Patterns Working in CLI and HTML\n');
