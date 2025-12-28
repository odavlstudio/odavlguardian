/**
 * Live Pattern Detection Example
 */

const fs = require('fs');
const path = require('path');
const { analyzePatterns } = require('./src/guardian/pattern-analyzer');

// Analyze patterns from existing artifacts
const patterns = analyzePatterns('./artifacts', 'localhost-3000', 10);

if (patterns.length > 0) {
  console.log('\n🔍 LIVE PATTERN DETECTION EXAMPLE');
  console.log('═'.repeat(70));
  console.log('Site: localhost-3000 | Analyzing last 10 runs');
  console.log('═'.repeat(70) + '\n');
  
  patterns.forEach((p, idx) => {
    console.log(`Pattern ${idx+1}: [${p.confidence.toUpperCase()}]`);
    console.log(`  Type: ${p.type}`);
    console.log(`  Summary: ${p.summary}`);
    console.log(`  Impact: ${p.whyItMatters}`);
    console.log(`  Evidence:`);
    Object.entries(p.evidence).forEach(([k, v]) => {
      const displayVal = Array.isArray(v) ? v.slice(0, 2).join(', ') + (v.length > 2 ? '...' : '') : v;
      console.log(`    • ${k}: ${displayVal}`);
    });
    console.log(`  Limits: ${p.limits}`);
    console.log();
  });
  
  console.log('═'.repeat(70));
} else {
  console.log('\n📊 No recurring patterns detected.');
  console.log('Patterns require at least 2 runs. As you run more evaluations,');
  console.log('Guardian will highlight emerging risks across your test history.\n');
}
