#!/usr/bin/env node
/**
 * Delta Insight Demo
 * 
 * Shows example output of Delta Insight in CLI, HTML, and decision.json formats.
 */

const { formatDeltaInsight } = require('./src/guardian/text-formatters');

console.log('📊 Delta Insight Demo\n');
console.log('Stage V / Step 5.1: Minimal human-readable delta between current and previous run\n');

// Scenario 1: Verdict improved
console.log('='.repeat(70));
console.log('Scenario 1: Verdict Improved (FRICTION → READY)');
console.log('='.repeat(70));

const scenario1Current = {
  verdict: 'READY',
  confidence: { level: 'high', score: 0.95 },
  why: 'All user flows completed successfully'
};

const scenario1Previous = {
  verdict: 'FRICTION',
  confidence: { level: 'medium', score: 0.65 },
  why: 'Login flow experiencing issues'
};

const delta1 = formatDeltaInsight(scenario1Current, scenario1Previous, [], []);

console.log('\n--- CLI Output ---');
console.log('⚠️ VERDICT CARD:');
console.log('  Status: READY');
console.log('  Confidence: high (0.95)');
console.log('  Why: All user flows completed successfully');
console.log('');
console.log('📊 Delta Insight:');
delta1.improved.forEach(line => console.log(`   ✅ ${line}`));
delta1.regressed.forEach(line => console.log(`   ⚠️  ${line}`));

console.log('\n--- HTML Snippet ---');
console.log('<div class="verdict-item"><strong>Delta Insight:</strong>');
console.log('  <ul class="bullets">');
delta1.improved.forEach(line => console.log(`    <li>✅ ${line}</li>`));
delta1.regressed.forEach(line => console.log(`    <li>⚠️ ${line}</li>`));
console.log('  </ul>');
console.log('</div>');

console.log('\n--- decision.json ---');
console.log(JSON.stringify({
  verdict: {
    status: 'READY',
    confidence: 'high',
    why: 'All user flows completed successfully'
  },
  deltaInsight: {
    improved: delta1.improved,
    regressed: delta1.regressed
  }
}, null, 2));

// Scenario 2: Verdict regressed + new critical pattern
console.log('\n\n' + '='.repeat(70));
console.log('Scenario 2: Verdict Regressed + New Critical Pattern');
console.log('='.repeat(70));

const scenario2Current = {
  verdict: 'DO_NOT_LAUNCH',
  confidence: { level: 'high', score: 0.90 },
  why: 'Critical blocking issue detected'
};

const scenario2Previous = {
  verdict: 'READY',
  confidence: { level: 'high', score: 0.92 },
  why: 'All checks passed'
};

const scenario2Patterns = [
  { type: 'single_point_failure', pathName: 'Payment processing', confidence: 0.95 }
];

const delta2 = formatDeltaInsight(scenario2Current, scenario2Previous, scenario2Patterns, []);

console.log('\n--- CLI Output ---');
console.log('⛔ VERDICT CARD:');
console.log('  Status: DO_NOT_LAUNCH');
console.log('  Confidence: high (0.90)');
console.log('  Why: Critical blocking issue detected');
console.log('');
console.log('📊 Delta Insight:');
delta2.improved.forEach(line => console.log(`   ✅ ${line}`));
delta2.regressed.forEach(line => console.log(`   ⚠️  ${line}`));

console.log('\n--- HTML Snippet ---');
console.log('<div class="verdict-item"><strong>Delta Insight:</strong>');
console.log('  <ul class="bullets">');
delta2.improved.forEach(line => console.log(`    <li>✅ ${line}</li>`));
delta2.regressed.forEach(line => console.log(`    <li>⚠️ ${line}</li>`));
console.log('  </ul>');
console.log('</div>');

console.log('\n--- decision.json ---');
console.log(JSON.stringify({
  verdict: {
    status: 'DO_NOT_LAUNCH',
    confidence: 'high',
    why: 'Critical blocking issue detected'
  },
  deltaInsight: {
    improved: delta2.improved,
    regressed: delta2.regressed
  }
}, null, 2));

// Scenario 3: Pattern resolved (friction cleared)
console.log('\n\n' + '='.repeat(70));
console.log('Scenario 3: Critical Pattern Resolved');
console.log('='.repeat(70));

const scenario3Current = {
  verdict: 'FRICTION',
  confidence: { level: 'medium', score: 0.65 },
  why: 'Minor UI issues detected'
};

const scenario3Previous = {
  verdict: 'FRICTION',
  confidence: { level: 'medium', score: 0.60 },
  why: 'Multiple issues affecting experience'
};

const scenario3PreviousPatterns = [
  { type: 'single_point_failure', pathName: 'Login', confidence: 0.90 }
];

const delta3 = formatDeltaInsight(scenario3Current, scenario3Previous, [], scenario3PreviousPatterns);

console.log('\n--- CLI Output ---');
console.log('⚠️ VERDICT CARD:');
console.log('  Status: FRICTION');
console.log('  Confidence: medium (0.65)');
console.log('  Why: Minor UI issues detected');
console.log('');
console.log('📊 Delta Insight:');
delta3.improved.forEach(line => console.log(`   ✅ ${line}`));
delta3.regressed.forEach(line => console.log(`   ⚠️  ${line}`));

console.log('\n--- HTML Snippet ---');
console.log('<div class="verdict-item"><strong>Delta Insight:</strong>');
console.log('  <ul class="bullets">');
delta3.improved.forEach(line => console.log(`    <li>✅ ${line}</li>`));
delta3.regressed.forEach(line => console.log(`    <li>⚠️ ${line}</li>`));
console.log('  </ul>');
console.log('</div>');

console.log('\n--- decision.json ---');
console.log(JSON.stringify({
  verdict: {
    status: 'FRICTION',
    confidence: 'medium',
    why: 'Minor UI issues detected'
  },
  deltaInsight: {
    improved: delta3.improved,
    regressed: delta3.regressed
  }
}, null, 2));

// Scenario 4: No meaningful change (suppressed)
console.log('\n\n' + '='.repeat(70));
console.log('Scenario 4: No Meaningful Change (Delta Insight Suppressed)');
console.log('='.repeat(70));

const scenario4Current = {
  verdict: 'FRICTION',
  confidence: { level: 'medium', score: 0.65 },
  why: 'Minor issues detected'
};

const scenario4Previous = {
  verdict: 'FRICTION',
  confidence: { level: 'medium', score: 0.66 },
  why: 'Minor issues detected'
};

const delta4 = formatDeltaInsight(scenario4Current, scenario4Previous, [], []);

console.log('\n--- CLI Output ---');
console.log('⚠️ VERDICT CARD:');
console.log('  Status: FRICTION');
console.log('  Confidence: medium (0.65)');
console.log('  Why: Minor issues detected');
console.log('');
console.log('📊 Delta Insight: (suppressed - no meaningful change)');
console.log('');

console.log('\n--- HTML Snippet ---');
console.log('(Delta Insight section not rendered when suppressed)');

console.log('\n--- decision.json ---');
console.log(JSON.stringify({
  verdict: {
    status: 'FRICTION',
    confidence: 'medium',
    why: 'Minor issues detected'
  }
  // deltaInsight field not included when suppressed
}, null, 2));

console.log('\n\n' + '='.repeat(70));
console.log('Demo complete!');
console.log('='.repeat(70));
console.log('\nKey Features:');
console.log('  ✅ Compares N vs N-1 (current vs previous run)');
console.log('  ✅ Max 2 lines total (1 improved + 1 regressed)');
console.log('  ✅ Priority: Verdict > Confidence > Patterns');
console.log('  ✅ Suppressed when no meaningful change');
console.log('  ✅ Calm, factual language (no commands or advice)');
console.log('  ✅ Identical text across CLI, HTML, decision.json');
