// Quick manual test to generate sample output with focus summary
const { formatFocusSummary } = require('./src/guardian/text-formatters');

// Example with multiple patterns
const verdict = {
  verdict: 'FRICTION',
  confidence: { level: 'medium', score: 0.55 }
};

const patterns = [
  {
    type: 'single_point_failure',
    pathName: 'Login flow',
    summary: 'Login always fails',
    confidence: 'high'
  },
  {
    type: 'confidence_degradation',
    pathName: 'Checkout',
    summary: 'Quality declining',
    confidence: 'high'
  },
  {
    type: 'recurring_friction',
    pathName: 'Search',
    summary: 'Search friction repeating',
    confidence: 'medium'
  }
];

console.log('🎯 Focus Summary:');
const focus = formatFocusSummary(verdict, patterns);
focus.forEach(line => console.log(`   • ${line}`));

console.log('\n--- Example CLI Output ---\n');
console.log('⚠️ VERDICT CARD:');
console.log('  Status: FRICTION');
console.log('  Confidence: medium (0.55)');
console.log('  Why: Multiple issues affecting user experience');
console.log('');
console.log('🎯 Focus Summary:');
focus.forEach(line => console.log(`   • ${line}`));

console.log('\n--- Example HTML Snippet ---\n');
console.log('<div class="verdict-item"><strong>Focus Summary:</strong>');
console.log('  <ul class="bullets">');
focus.forEach(line => console.log(`    <li>${line}</li>`));
console.log('  </ul>');
console.log('</div>');

console.log('\n--- Example decision.json ---\n');
console.log(JSON.stringify({
  verdict: {
    status: 'FRICTION',
    confidence: 'medium',
    why: 'Multiple issues affecting user experience'
  },
  focusSummary: focus
}, null, 2));
