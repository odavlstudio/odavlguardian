#!/usr/bin/env node
/**
 * Test helper: Create test runs with META.json for cleanup/list testing
 */
const fs = require('fs');
const path = require('path');

const { makeSiteSlug, makeRunDirName, writeMetaJson } = require('./src/guardian/run-artifacts');

// Test URLs and configs
const testRuns = [
  {
    url: 'https://github.com',
    policy: 'startup',
    result: 0, // PASSED
    durationMs: 45000,
    attempts: { total: 3, successful: 3, failed: 0, skipped: 0 },
    ageHours: 10 // 10 hours ago
  },
  {
    url: 'https://github.com',
    policy: 'enterprise',
    result: 1, // FAILED
    durationMs: 32000,
    attempts: { total: 3, successful: 2, failed: 1, skipped: 0 },
    ageHours: 5 // 5 hours ago
  },
  {
    url: 'http://localhost:3000',
    policy: 'startup',
    result: 0, // PASSED
    durationMs: 28000,
    attempts: { total: 3, successful: 3, failed: 0, skipped: 0 },
    ageHours: 2 // 2 hours ago
  },
  {
    url: 'https://example.com',
    policy: 'landing-demo',
    result: 2, // WARN
    durationMs: 55000,
    attempts: { total: 5, successful: 4, failed: 0, skipped: 1 },
    ageHours: 8 // 8 hours ago
  },
  {
    url: 'https://github.com',
    policy: 'saas',
    result: 1, // FAILED
    durationMs: 20000,
    attempts: { total: 2, successful: 1, failed: 1, skipped: 0 },
    ageHours: 1 // 1 hour ago (most recent github)
  }
];

const artifactsDir = path.join(__dirname, 'artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

console.log('Creating test runs for cleanup and list testing...\n');

testRuns.forEach((testRun, index) => {
  // Calculate timestamp: now minus ageHours
  const now = new Date();
  const timestamp = new Date(now.getTime() - testRun.ageHours * 60 * 60 * 1000);
  
  // Map result code to string
  const resultMap = { 0: 'PASSED', 1: 'FAILED', 2: 'WARN' };
  const resultStr = resultMap[testRun.result];
  
  const siteSlug = makeSiteSlug(testRun.url);
  const dirName = makeRunDirName({ 
    timestamp: timestamp, 
    url: testRun.url, 
    policy: testRun.policy, 
    result: resultStr 
  });
  const dirPath = path.join(artifactsDir, dirName);
  
  // Create directory
  fs.mkdirSync(dirPath, { recursive: true });
  
  // Create META.json
  const metaPath = path.join(dirPath, 'META.json');
  const metaData = {
    version: 1,
    timestamp: timestamp.toISOString(),
    url: testRun.url,
    siteSlug: siteSlug,
    policy: testRun.policy,
    result: resultStr,
    durationMs: testRun.durationMs,
    attempts: testRun.attempts
  };
  
  fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
  
  console.log(`✓ Created run ${index + 1}/${testRuns.length}`);
  console.log(`  Dir:      ${dirName}`);
  console.log(`  Site:     ${siteSlug}`);
  console.log(`  Policy:   ${testRun.policy}`);
  console.log(`  Result:   ${metaData.result}`);
  console.log(`  Age:      ${testRun.ageHours}h ago`);
  console.log();
});

console.log('✓ All test runs created!');
console.log('\nNow try:');
console.log('  node bin/guardian.js list');
console.log('  node bin/guardian.js list --failed');
console.log('  node bin/guardian.js list --site github-com');
console.log('  node bin/guardian.js cleanup --older-than 6h');
console.log('  node bin/guardian.js cleanup --keep-latest 2');
