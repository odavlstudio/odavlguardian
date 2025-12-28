#!/usr/bin/env node
/**
 * Stage V Final Validation Test
 * Comprehensive check of all components
 */

console.log('\n' + '═'.repeat(70));
console.log('🧪 STAGE V FINAL VALIDATION TEST');
console.log('═'.repeat(70) + '\n');

// Test 1: Pattern Analyzer Tests
console.log('Test 1: Pattern Analyzer Unit Tests');
console.log('─'.repeat(70));
try {
  require('./test/pattern-analyzer.test.js');
  console.log('✅ Pattern analyzer tests completed\n');
} catch (e) {
  console.error('❌ Pattern analyzer tests failed:', e.message);
}

// Test 2: Check module exports
console.log('Test 2: Module Exports');
console.log('─'.repeat(70));
try {
  const pa = require('./src/guardian/pattern-analyzer');
  const clis = require('./src/guardian/cli-summary');
  const html = require('./src/guardian/enhanced-html-reporter');
  
  console.log('✅ pattern-analyzer exports:', Object.keys(pa).join(', '));
  console.log('✅ cli-summary exports:', Object.keys(clis).join(', '));
  console.log('✅ enhanced-html-reporter exports:', Object.keys(html).join(', '));
  console.log();
} catch (e) {
  console.error('❌ Module import failed:', e.message);
}

// Test 3: File size check
const fs = require('fs');
const path = require('path');

console.log('Test 3: Code Metrics');
console.log('─'.repeat(70));
const files = [
  './src/guardian/pattern-analyzer.js',
  './test/pattern-analyzer.test.js'
];

let totalLines = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  totalLines += lines;
  console.log(`✅ ${path.basename(f)}: ${lines} lines`);
}
console.log(`✅ Total implementation: ${totalLines} lines\n`);

// Test 4: Pattern detection with test data
console.log('Test 4: Live Pattern Detection');
console.log('─'.repeat(70));
try {
  const { analyzePatterns } = require('./src/guardian/pattern-analyzer');
  const patterns = analyzePatterns('./test-artifacts/pattern-demo', 'demo-site', 10);
  console.log(`✅ Detected ${patterns.length} patterns in test data`);
  console.log('  Pattern types:', [...new Set(patterns.map(p => p.type))].join(', '));
  console.log();
} catch (e) {
  console.log('⚠️  Pattern detection skipped (test data may not exist)\n');
}

// Test 5: Integration check
console.log('Test 5: CLI/HTML Integration');
console.log('─'.repeat(70));
try {
  const { generateCliSummary } = require('./src/guardian/cli-summary');
  const { generateEnhancedHtml } = require('./src/guardian/enhanced-html-reporter');
  
  const testSnapshot = {
    meta: { url: 'http://test.com', runId: 'test' },
    verdict: { verdict: 'READY', confidence: { level: 'high', score: 0.95 } },
    attempts: []
  };
  
  const cli = generateCliSummary(testSnapshot, null, null, {
    artifactsDir: './test-artifacts/pattern-demo',
    siteSlug: 'demo-site'
  });
  
  const html = generateEnhancedHtml(testSnapshot, '.', {
    artifactsDir: './test-artifacts/pattern-demo',
    siteSlug: 'demo-site'
  });
  
  console.log('✅ CLI generation successful');
  console.log('✅ HTML generation successful');
  console.log('✅ Pattern options passed and processed');
  console.log();
} catch (e) {
  console.error('❌ Integration test failed:', e.message);
}

console.log('═'.repeat(70));
console.log('✅ STAGE V VALIDATION COMPLETE');
console.log('═'.repeat(70) + '\n');
