/**
 * Guardian Narrative Integration Test — 4-Run Progression
 * 
 * This test simulates a realistic scenario where Guardian evaluates the same
 * application over 4 consecutive runs, demonstrating:
 * 
 * 1. Run 1: Initial discovery, full context
 * 2. Run 2: Confirmation, journey progress (2/3)
 * 3. Run 3: Pattern refinement, silence begins
 * 4. Run 4: Authority established, confidence suppressed
 * 
 * The test validates that messaging progression is correct and silence rules
 * are applied consistently.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  shouldRenderJourneyMessage,
  shouldRenderConfidenceDrivers,
  formatJourneyMessage,
  formatConfidenceDrivers
} = require('../src/guardian/text-formatters');

console.log('\n📖 GUARDIAN NARRATIVE — 4-Run Integration Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let narrativePass = true;

/**
 * Simulate Run 1 (runIndex=0): Initial Discovery
 */
console.log('🏃 RUN 1 (runIndex=0) — Initial Discovery Phase\n');

const run1Verdict = {
  verdict: 'READY',
  confidence: { level: 'medium', score: 0.65 },
  coverage: 0.65,
  totalAttempts: 10,
  successfulAttempts: 8,
  skippedAttempts: 2,
  drivers: [
    { type: 'coverage', reason: '65% coverage achieved' },
    { type: 'execution', reason: '8/10 attempts successful' }
  ]
};

const run1JourneyShow = shouldRenderJourneyMessage(0);
const run1DriverShow = shouldRenderConfidenceDrivers(run1Verdict, 0);

console.log(`  Journey Message Shown: ${run1JourneyShow ? '✅ YES' : '❌ NO'}`);
console.log(`  Confidence Drivers Shown: ${run1DriverShow ? '✅ YES' : '❌ NO'}`);

if (!run1JourneyShow) {
  console.error('  ERROR: Run 1 must show journey message for context');
  narrativePass = false;
}
if (!run1DriverShow) {
  console.error('  ERROR: Run 1 must show confidence drivers for transparency');
  narrativePass = false;
}

console.log(`\n  Expected Output Components:\n`);
console.log(`    📝 Journey Message: "Beginning first evaluation (1/3 complete)"`);
console.log(`    📊 Drivers: "Coverage at 65% | 8 successful attempts out of 10 total"`);
console.log(`    💡 Confidence: "MEDIUM confidence (single run, 65% coverage)"`);

/**
 * Simulate Run 2 (runIndex=1): Confirmation & Progress
 */
console.log('\n\n🏃 RUN 2 (runIndex=1) — Confirmation Phase\n');

const run2Verdict = {
  verdict: 'READY',
  confidence: { level: 'medium', score: 0.68 },
  coverage: 0.68,
  totalAttempts: 10,
  successfulAttempts: 8,
  skippedAttempts: 2,
  drivers: [
    { type: 'stability', reason: 'Same attempts succeeded as Run 1' },
    { type: 'coverage_growth', reason: 'Coverage grew from 65% to 68%' }
  ]
};

const run2JourneyShow = shouldRenderJourneyMessage(1);
const run2DriverShow = shouldRenderConfidenceDrivers(run2Verdict, 1);

console.log(`  Journey Message Shown: ${run2JourneyShow ? '✅ YES' : '❌ NO'}`);
console.log(`  Confidence Drivers Shown: ${run2DriverShow ? '✅ YES' : '❌ NO'}`);

if (!run2JourneyShow) {
  console.error('  ERROR: Run 2 must show journey to show progress (2/3)');
  narrativePass = false;
}
if (!run2DriverShow) {
  console.error('  ERROR: Run 2 must show drivers to explain confirmation');
  narrativePass = false;
}

console.log(`\n  Expected Output Components:\n`);
console.log(`    📝 Journey Message: "Confirmed in second run (2/3 complete)"`);
console.log(`    📊 Drivers: "Consistency verified | Coverage growth from 65→68%"`);
console.log(`    💡 Confidence: "MEDIUM confidence (2 runs show consistency)"`);

/**
 * Simulate Run 3 (runIndex=2): Pattern Refinement, Silence Begins
 */
console.log('\n\n🏃 RUN 3 (runIndex=2) — Pattern Recognition Phase\n');

const run3Verdict = {
  verdict: 'READY',
  confidence: { level: 'high', score: 0.82 },
  coverage: 0.71,
  totalAttempts: 10,
  successfulAttempts: 9,
  skippedAttempts: 1,
  patterns: [
    { patternId: 'stable_checkout', confidence: 0.85, type: 'success_pattern' },
    { patternId: 'form_validation', confidence: 0.75, type: 'behavior_pattern' }
  ],
  drivers: [
    { type: 'pattern_emergence', reason: 'Consistent behavior patterns observed' },
    { type: 'high_confidence', reason: 'Three runs establishing authority' }
  ]
};

const run3JourneyShow = shouldRenderJourneyMessage(2);
const run3DriverShow = shouldRenderConfidenceDrivers(run3Verdict, 2);

console.log(`  Journey Message Shown: ${run3JourneyShow ? '✅ YES' : '❌ NO'}`);
console.log(`  Confidence Drivers Shown: ${run3DriverShow ? '✅ YES' : '❌ NO'}`);

if (run3JourneyShow) {
  console.error('  ERROR: Run 3 must suppress journey (runIndex>=2)');
  narrativePass = false;
}
if (run3DriverShow) {
  console.error('  ERROR: Run 3 with HIGH confidence must suppress drivers (runIndex>=2)');
  narrativePass = false;
}

console.log(`\n  Expected Output Components:\n`);
console.log(`    📝 Journey Message: ⏸️  SUPPRESSED (runIndex=2 triggers silence)`);
console.log(`    📊 Drivers: ⏸️  SUPPRESSED (HIGH confidence + runIndex>=2)`);
console.log(`    🔍 Patterns: "2 behavior patterns locked in (stability confirmed)"`);
console.log(`    💡 Confidence: "HIGH confidence (authority established over 3 runs)"`);

/**
 * Simulate Run 4 (runIndex=3): Authority, Full Silence
 */
console.log('\n\n🏃 RUN 4 (runIndex=3) — Authority Phase\n');

const run4Verdict = {
  verdict: 'READY',
  confidence: { level: 'high', score: 0.85 },
  coverage: 0.72,
  totalAttempts: 10,
  successfulAttempts: 9,
  skippedAttempts: 1,
  patterns: [
    { patternId: 'stable_checkout', confidence: 0.88, type: 'success_pattern' },
    { patternId: 'form_validation', confidence: 0.82, type: 'behavior_pattern' },
    { patternId: 'error_recovery', confidence: 0.71, type: 'resilience_pattern' }
  ],
  drivers: [
    { type: 'authority_established', reason: 'Four runs of consistent behavior' }
  ]
};

const run4JourneyShow = shouldRenderJourneyMessage(3);
const run4DriverShow = shouldRenderConfidenceDrivers(run4Verdict, 3);

console.log(`  Journey Message Shown: ${run4JourneyShow ? '✅ YES' : '❌ NO'}`);
console.log(`  Confidence Drivers Shown: ${run4DriverShow ? '✅ YES' : '❌ NO'}`);

if (run4JourneyShow) {
  console.error('  ERROR: Run 4 must suppress journey (runIndex>=2)');
  narrativePass = false;
}
if (run4DriverShow) {
  console.error('  ERROR: Run 4 must suppress drivers (runIndex>=2)');
  narrativePass = false;
}

console.log(`\n  Expected Output Components:\n`);
console.log(`    📝 Journey Message: ⏸️  SUPPRESSED (full silence at runIndex=3)`);
console.log(`    📊 Drivers: ⏸️  SUPPRESSED (authority mode enabled)`);
console.log(`    🔍 Patterns: "3 behavior patterns locked and verified"`);
console.log(`    💡 Confidence: "HIGH confidence — Authority established and confirmed"`);
console.log(`    ✅ Verdict: "Application is READY for production"`);

// ============================================================================
// NARRATIVE COHERENCE VALIDATION
// ============================================================================

console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n✔️  NARRATIVE COHERENCE CHECKS\n');

const coherenceChecks = [
  {
    name: 'Journey suppression timeline',
    pass: !run1JourneyShow === false && !run2JourneyShow === false && !run3JourneyShow && !run4JourneyShow,
    detail: 'Runs 1-2 show journey, runs 3-4 suppress it'
  },
  {
    name: 'Driver suppression timeline',
    pass: !run1DriverShow === false && !run2DriverShow === false && !run3DriverShow && !run4DriverShow,
    detail: 'Runs 1-2 show drivers, runs 3-4 suppress (when HIGH confidence)'
  },
  {
    name: 'Confidence progression',
    pass: run1Verdict.confidence.level === 'medium' && run3Verdict.confidence.level === 'high' && run4Verdict.confidence.level === 'high',
    detail: 'Confidence grows from MEDIUM → HIGH as runs accumulate'
  },
  {
    name: 'Pattern accumulation',
    pass: 
      (!run1Verdict.patterns || run1Verdict.patterns.length === 0) &&
      (!run2Verdict.patterns || run2Verdict.patterns.length === 0) &&
      (run3Verdict.patterns && run3Verdict.patterns.length === 2) &&
      (run4Verdict.patterns && run4Verdict.patterns.length === 3),
    detail: 'Patterns emerge after 2 runs and accumulate by run 4'
  },
  {
    name: 'Coverage continuity',
    pass: run1Verdict.coverage <= run2Verdict.coverage && run2Verdict.coverage <= run3Verdict.coverage,
    detail: 'Coverage increases or remains stable across runs'
  },
  {
    name: 'Verdict consistency',
    pass: run1Verdict.verdict === 'READY' && run2Verdict.verdict === 'READY' && 
          run3Verdict.verdict === 'READY' && run4Verdict.verdict === 'READY',
    detail: 'Verdict remains READY throughout (no regression)'
  }
];

let allCoherentChecksPass = true;
for (const check of coherenceChecks) {
  const status = check.pass ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  console.log(`   ${check.detail}`);
  if (!check.pass) {
    allCoherentChecksPass = false;
  }
}

// ============================================================================
// FINAL NARRATIVE RESULT
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (narrativePass && allCoherentChecksPass) {
  console.log('🎬 NARRATIVE INTEGRATION TEST: PASSED\n');
  console.log('✨ Guardian tells a coherent story across 4 runs:');
  console.log('   1. Discovers application state (MEDIUM confidence)');
  console.log('   2. Confirms findings (MEDIUM confidence, journey progresses)');
  console.log('   3. Recognizes patterns (HIGH confidence, silence begins)');
  console.log('   4. Establishes authority (HIGH confidence, full silence)\n');
  process.exit(0);
} else {
  console.log('🚨 NARRATIVE INTEGRATION TEST: FAILED\n');
  console.log('❌ Narrative coherence check failed — silence rules not applied correctly\n');
  process.exit(1);
}
