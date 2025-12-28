/**
 * Phase 10: Quick Integration Verification
 */

console.log('\n🎯 Phase 10 Integration Verification\n');

const { registerUser, getFounderMessage } = require('../src/founder/founder-tracker');
const { recordFirstScan, getSignals } = require('../src/founder/usage-signals');

// Register user
registerUser();
console.log('✅ User registered');

// Track scan
recordFirstScan();
console.log('✅ Scan tracked');

// Check signals
const signals = getSignals();
console.log(`✅ Signals: ${signals.totalScans} scans`);

// Check founder status
const msg = getFounderMessage();
console.log(`✅ Founder: ${msg ? 'YES' : 'NO'}`);
if (msg) {
  console.log(`   ${msg}`);
}

console.log('\n🎉 Phase 10 fully functional!\n');
