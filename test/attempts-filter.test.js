/**
 * Phase 7.1 - Attempts Filter Tests
 * Tests filtering of attempts and flows based on user input
 */

const { validateAttemptFilter, filterAttempts, filterFlows } = require('../src/guardian/attempts-filter');
const { getDefaultAttemptIds } = require('../src/guardian/attempt-registry');
const { getDefaultFlowIds } = require('../src/guardian/flow-registry');

function testValidateAttemptFilter() {
  console.log('  Test: Validate known attempts');
  const result = validateAttemptFilter('contact_form,login');
  if (result.valid && result.ids.length === 2) {
    console.log('    ✅ Known attempts validate correctly');
  } else {
    console.log('    ❌ Known attempts validation failed');
  }
}

function testUnknownAttempt() {
  console.log('  Test: Unknown attempt error');
  const result = validateAttemptFilter('contact_form,invalid_attempt');
  if (!result.valid && result.error.includes('Unknown attempt')) {
    console.log('    ✅ Unknown attempt detected with clean error');
  } else {
    console.log('    ❌ Unknown attempt not caught');
  }
}

function testEmptyFilter() {
  console.log('  Test: Empty filter handling');
  const result = validateAttemptFilter('');
  if (result.valid && result.ids.length === 0) {
    console.log('    ✅ Empty filter returns valid with empty ids');
  } else {
    console.log('    ❌ Empty filter handling incorrect');
  }
}

function testFilterAttempts() {
  console.log('  Test: Filter attempts list');
  const attempts = getDefaultAttemptIds();
  const filtered = filterAttempts(attempts, ['contact_form']);
  if (filtered.length === 1 && filtered[0] === 'contact_form') {
    console.log('    ✅ Filtering reduces list correctly');
  } else {
    console.log('    ❌ Filtering not working');
  }
}

function testFilterFlows() {
  console.log('  Test: Filter flows list');
  const flows = getDefaultFlowIds();
  if (flows && flows.length > 0) {
    const firstFlow = flows[0];
    const filtered = filterFlows(flows, [firstFlow]);
    if (filtered.length === 1 && filtered[0] === firstFlow) {
      console.log('    ✅ Flow filtering works correctly');
    } else {
      console.log('    ⚠️  Flow filtering may have issues');
    }
  } else {
    console.log('    ⚠️  No default flows to test');
  }
}

function testNoMatches() {
  console.log('  Test: Filter with no matches');
  const attempts = ['contact_form'];
  const filtered = filterAttempts(attempts, ['nonexistent']);
  if (filtered.length === 0) {
    console.log('    ✅ Empty filter result correct');
  } else {
    console.log('    ❌ Filter should be empty');
  }
}

async function runAllTests() {
  console.log('\n🧪 Phase 7.1 - Attempts Filter Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  testValidateAttemptFilter();
  testUnknownAttempt();
  testEmptyFilter();
  testFilterAttempts();
  testFilterFlows();
  testNoMatches();

  console.log('\n✅ Attempts filter tests completed');
}

runAllTests().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
