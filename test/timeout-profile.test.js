/**
 * Phase 7.1 - Timeout Profile Tests
 * Tests timeout profile configuration and application
 */

const { getTimeoutProfile, TIMEOUT_PROFILES, resolveTimeout } = require('../src/guardian/timeout-profiles');

function testProfileExists() {
  console.log('  Test: All profiles exist');
  const profiles = ['fast', 'default', 'slow'];
  let allValid = true;
  for (const profile of profiles) {
    try {
      const config = getTimeoutProfile(profile);
      if (!config || !config.default) {
        console.log(`    ❌ Profile ${profile} invalid`);
        allValid = false;
      }
    } catch (e) {
      console.log(`    ❌ Profile ${profile} missing`);
      allValid = false;
    }
  }
  if (allValid) {
    console.log('    ✅ All profiles exist and valid');
  }
}

function testTimeoutValues() {
  console.log('  Test: Timeout values are increasing');
  const fastProfile = getTimeoutProfile('fast');
  const defaultProfile = getTimeoutProfile('default');
  const slowProfile = getTimeoutProfile('slow');
  
  if (fastProfile.default < defaultProfile.default && defaultProfile.default < slowProfile.default) {
    console.log('    ✅ Fast < Default < Slow');
  } else {
    console.log('    ❌ Timeout ordering incorrect');
  }
}

function testInvalidProfile() {
  console.log('  Test: Invalid profile error');
  try {
    getTimeoutProfile('invalid');
    console.log('    ❌ Should throw error for invalid profile');
  } catch (e) {
    if (e.message.includes('Invalid timeout profile')) {
      console.log('    ✅ Invalid profile caught with clean error');
    } else {
      console.log('    ❌ Error message not helpful');
    }
  }
}

function testResolveTimeout() {
  console.log('  Test: Resolve timeout with config value');
  const profile = getTimeoutProfile('fast');
  const resolved1 = resolveTimeout(5000, profile);
  const resolved2 = resolveTimeout(null, profile);
  
  if (resolved1 === 5000 && resolved2 === profile.default) {
    console.log('    ✅ Timeout resolution works correctly');
  } else {
    console.log('    ❌ Timeout resolution incorrect');
  }
}

function testDefaultProfile() {
  console.log('  Test: Default profile matches baseline');
  const defaultProfile = getTimeoutProfile('default');
  if (defaultProfile.default === 20000) {
    console.log('    ✅ Default profile matches baseline (20000ms)');
  } else {
    console.log(`    ⚠️  Default is ${defaultProfile.default}ms (expected 20000ms)`);
  }
}

function testFastProfile() {
  console.log('  Test: Fast profile is aggressive');
  const fastProfile = getTimeoutProfile('fast');
  if (fastProfile.default === 8000 && fastProfile.actionWait === 2000) {
    console.log('    ✅ Fast profile has aggressive timeouts');
  } else {
    console.log(`    ⚠️  Fast profile values: ${JSON.stringify(fastProfile)}`);
  }
}

async function runAllTests() {
  console.log('\n🧪 Phase 7.1 - Timeout Profile Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  testProfileExists();
  testTimeoutValues();
  testInvalidProfile();
  testResolveTimeout();
  testDefaultProfile();
  testFastProfile();

  console.log('\n✅ Timeout profile tests completed');
}

runAllTests().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
