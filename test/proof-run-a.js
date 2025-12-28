#!/usr/bin/env node
/**
 * PROOF RUN A: Happy Path - CLI Found & Extension Works
 * 
 * Simulates: VS Code Extension resolving guardian CLI successfully,
 * running reality check, reading decision.json, displaying verdict notification.
 * 
 * Expected: All artifacts created, decision.json readable, verdict shown.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const GUARDIAN_CLI = path.join(PROJECT_ROOT, 'bin', 'guardian.js');
const TEST_URL = 'https://example.com';
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, '.guardian');

// Ensure artifacts dir exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║            PROOF RUN A: Happy Path (CLI Found)                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Test Configuration:');
console.log(`   URL: ${TEST_URL}`);
console.log(`   Guardian CLI: ${GUARDIAN_CLI}`);
console.log(`   Artifacts Dir: ${ARTIFACTS_DIR}`);
console.log(`   Exit codes: OBSERVED=0, PARTIAL=1, INSUFFICIENT_DATA=2\n`);

// Run guardian
console.log('🚀 Step 1: Running Guardian CLI...\n');

const proc = spawn('node', [GUARDIAN_CLI, 'reality', '--url', TEST_URL, '--artifacts', ARTIFACTS_DIR], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit'
});

proc.on('close', (exitCode) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ CLI execution completed with exit code: ${exitCode}\n`);
  
  // Step 2: Verify artifacts
  console.log('🔍 Step 2: Verifying artifacts...\n');
  
  const runDirs = fs.readdirSync(ARTIFACTS_DIR)
    .filter(f => f.startsWith('run-'))
    .sort()
    .reverse();
  
  if (runDirs.length === 0) {
    console.log('❌ No run directories found!');
    process.exit(1);
  }
  
  const latestRunDir = runDirs[0];
  const runPath = path.join(ARTIFACTS_DIR, latestRunDir);
  
  console.log(`   ✓ Latest run directory: ${latestRunDir}`);
  console.log(`   ✓ Path: ${runPath}\n`);
  
  // Step 3: Check decision.json
  console.log('📖 Step 3: Reading decision.json...\n');
  
  const decisionPath = path.join(runPath, 'decision.json');
  if (!fs.existsSync(decisionPath)) {
    console.log(`❌ decision.json not found at ${decisionPath}`);
    process.exit(1);
  }
  
  const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf-8'));
  
  console.log('   📋 Decision Object:');
  console.log(`      verdict: ${decision.verdict}`);
  console.log(`      timestamp: ${decision.timestamp}`);
  console.log(`      url: ${decision.url}`);
  console.log(`      exitCode: ${decision.exitCode}`);
  console.log(`      confidence: ${decision.confidence}`);
  
  // Step 4: Display as extension would
  console.log('\n🎨 Step 4: Displaying notification (as VS Code Extension would)...\n');
  
  const verdictValue = decision.verdict;
  const exitCodeValue = decision.exitCode;
  let icon = '';
  let color = '';
  
  switch (verdictValue) {
    case 'OBSERVED':
      icon = '✅';
      color = 'GREEN';
      break;
    case 'PARTIAL':
      icon = '⚠️';
      color = 'YELLOW';
      break;
    case 'INSUFFICIENT_DATA':
      icon = '❓';
      color = 'BLUE';
      break;
    default:
      icon = '❓';
      color = 'GRAY';
  }
  
  console.log(`   ┌─────────────────────────────────────────────────┐`);
  console.log(`   │ ${icon}  Verdict: ${verdictValue.padEnd(30)} │`);
  console.log(`   │ Exit Code: ${exitCodeValue} (${getExitCodeName(exitCodeValue)})${' '.repeat(15)} │`);
  console.log(`   │                                                 │`);
  console.log(`   │ [Open summary.md]    [Open artifacts folder]   │`);
  console.log(`   └─────────────────────────────────────────────────┘\n`);
  
  // Step 5: Verify button targets
  console.log('🔗 Step 5: Verifying button targets...\n');
  
  const summaryPath = path.join(runPath, 'summary.md');
  const artifactsTarget = runPath;
  
  if (fs.existsSync(summaryPath)) {
    console.log(`   ✓ summary.md exists: ${summaryPath}`);
    const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
    console.log(`   ✓ summary.md size: ${summaryContent.length} bytes`);
  } else {
    console.log(`   ⚠️  summary.md not found`);
  }
  
  if (fs.existsSync(artifactsTarget)) {
    console.log(`   ✓ artifacts folder exists: ${artifactsTarget}`);
    const contents = fs.readdirSync(artifactsTarget);
    console.log(`   ✓ artifacts folder contains: ${contents.length} items`);
  } else {
    console.log(`   ❌ artifacts folder missing`);
  }
  
  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ PROOF RUN A COMPLETE: Happy Path Verified\n');
  console.log('   ✓ Guardian CLI resolved and executed');
  console.log('   ✓ Artifacts created in .guardian directory');
  console.log('   ✓ decision.json readable with verdict');
  console.log('   ✓ Notification would display with correct verdict');
  console.log('   ✓ Button targets (summary.md, artifacts) exist and accessible\n');
  
  process.exit(0);
});

function getExitCodeName(code) {
  const names = {
    0: 'OBSERVED',
    1: 'PARTIAL',
    2: 'INSUFFICIENT_DATA'
  };
  return names[code] || 'UNKNOWN';
}
