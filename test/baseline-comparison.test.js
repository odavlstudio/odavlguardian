/**
 * Phase 3.2: Baseline Comparison Test Suite
 * 
 * Tests baseline comparison feature with scenarios:
 * 1. SUCCESS → FAILURE = REGRESSED
 * 2. FAILURE → SUCCESS = IMPROVED
 * 3. Missing baseline = no comparison (warning, continues)
 * 4. Corrupt baseline = warning continues
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { startFixtureServer } = require('./fixture-server');
const { saveBaseline, checkBaseline } = require('../src/guardian/baseline');

function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function runSave(baseUrl, artifactsDir, name, attempts) {
  return await saveBaseline({ baseUrl, artifactsDir, name, attempts });
}

async function runCheck(baseUrl, artifactsDir, name, attempts) {
  return await checkBaseline({ baseUrl, artifactsDir, name, attempts });
}

(async () => {
  console.log('\n🧪 Baseline Comparison Tests (Phase 3.2)');

  const fixture = await startFixtureServer(0);
  try {
    const artifactsRoot = mkTmp('guardian-baseline-comparison-');
    const attempts = ['contact_form', 'language_switch', 'newsletter_signup'];

    // Test 1: SUCCESS → FAILURE = REGRESSED
    console.log('  Test 1: SUCCESS → FAILURE (regression)');
    {
      const baselineName = 'test-regression';
      // Save baseline with SUCCESS state
      await runSave(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      // Check with FAILURE state
      const result = await runCheck(`${fixture.baseUrl}?mode=fail`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.overallRegressionVerdict, 'REGRESSION_FAILURE', 
        'SUCCESS→FAILURE should be REGRESSION_FAILURE');
      assert.strictEqual(result.exitCode, 4, 
        'Regression failure should produce exit code 4');
      
      const regressions = result.comparisons.filter(c => c.regressionType !== 'NO_REGRESSION');
      assert.ok(regressions.length > 0, 
        'Should have at least one regression');
      
      const regressed = regressions.find(r => 
        r.baselineOutcome === 'SUCCESS' && r.currentOutcome === 'FAILURE');
      assert.ok(regressed, 
        'Should find at least one SUCCESS→FAILURE regression');
      assert.ok(regressed.regressionReasons.length > 0, 
        'Regression should have reasons');
      
      console.log('    ✅ Detected regression with reasons');
    }

    // Test 2: FAILURE → SUCCESS = IMPROVED
    console.log('  Test 2: FAILURE → SUCCESS (improvement)');
    {
      const baselineName = 'test-improvement';
      // Save baseline with FAILURE state
      await runSave(`${fixture.baseUrl}?mode=fail`, artifactsRoot, baselineName, attempts);
      
      // Check with SUCCESS state
      const result = await runCheck(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.overallRegressionVerdict, 'NO_REGRESSION', 
        'FAILURE→SUCCESS should be NO_REGRESSION');
      assert.strictEqual(result.exitCode, 0, 
        'Improvement should have exit code 0');
      
      const improved = result.comparisons.filter(c => 
        c.improvements && c.improvements.length > 0);
      assert.ok(improved.length > 0, 
        'Should have at least one improvement');
      
      const improvement = improved.find(i => 
        i.baselineOutcome === 'FAILURE' && i.currentOutcome === 'SUCCESS');
      assert.ok(improvement, 
        'Should find at least one FAILURE→SUCCESS improvement');
      assert.ok(improvement.improvements.length > 0, 
        'Improvement should have improvement reasons');
      
      console.log('    ✅ Detected improvement with reasons');
    }

    // Test 3: Missing baseline = graceful skip (no error, no exit code change)
    console.log('  Test 3: Missing baseline (graceful skip)');
    {
      const baselineName = 'nonexistent-baseline';
      
      const result = await runCheck(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.exitCode, 0, 
        'Missing baseline should NOT affect exit code (returns 0)');
      assert.strictEqual(result.overallRegressionVerdict, 'NO_BASELINE', 
        'Missing baseline should set verdict to NO_BASELINE');
      assert.strictEqual(result.baselineStatus, 'NO_BASELINE',
        'Should set baselineStatus to NO_BASELINE');
      
      console.log('    ✅ Missing baseline handled gracefully (no error, exit code remains 0)');
    }

    // Test 4: Corrupt baseline = warning but continues (no error exit code)
    console.log('  Test 4: Corrupt baseline (warning, continues)');
    {
      const baselineName = 'test-corrupt';
      const baselinePath = path.join(artifactsRoot, 'baselines', `${baselineName}.json`);
      
      // Create baselines directory if not exists
      fs.mkdirSync(path.join(artifactsRoot, 'baselines'), { recursive: true });
      
      // Write corrupt JSON
      fs.writeFileSync(baselinePath, '{ invalid json }', 'utf8');
      
      const result = await runCheck(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.exitCode, 0, 
        'Corrupt baseline should NOT affect exit code (returns 0)');
      assert.strictEqual(result.overallRegressionVerdict, 'BASELINE_UNUSABLE',
        'Corrupt baseline should set verdict to BASELINE_UNUSABLE');
      assert.strictEqual(result.baselineStatus, 'BASELINE_UNUSABLE',
        'Should set baselineStatus to BASELINE_UNUSABLE');
      
      console.log('    ✅ Corrupt baseline handled gracefully (warning emitted, exit code remains 0)');
    }

    // Test 5: Schema version mismatch = warning but continues (no error exit code)
    console.log('  Test 5: Schema version mismatch (warning, continues)');
    {
      const baselineName = 'test-schema-mismatch';
      const baselinePath = path.join(artifactsRoot, 'baselines', `${baselineName}.json`);
      
      // Create baseline with wrong schema version
      const invalidSnapshot = {
        schemaVersion: 999,  // Invalid version
        baselineName,
        baseUrl: fixture.baseUrl,
        overallVerdict: 'SUCCESS',
        attempts: [],
        flows: []
      };
      
      fs.writeFileSync(baselinePath, JSON.stringify(invalidSnapshot), 'utf8');
      
      const result = await runCheck(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.exitCode, 0, 
        'Schema mismatch should NOT affect exit code (returns 0)');
      assert.strictEqual(result.overallRegressionVerdict, 'BASELINE_UNUSABLE',
        'Schema mismatch should set verdict to BASELINE_UNUSABLE');
      assert.strictEqual(result.baselineStatus, 'BASELINE_UNUSABLE',
        'Should set baselineStatus to BASELINE_UNUSABLE');
      
      console.log('    ✅ Schema mismatch handled gracefully (warning emitted, exit code remains 0)');
    }

    // Test 6: Friction regression detection
    console.log('  Test 6: Friction regression (SUCCESS → FRICTION)');
    {
      const baselineName = 'test-friction-reg';
      // Save baseline with SUCCESS state
      await runSave(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      // Check with FRICTION state
      const result = await runCheck(`${fixture.baseUrl}?mode=friction`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.overallRegressionVerdict, 'REGRESSION_FRICTION', 
        'SUCCESS→FRICTION should be REGRESSION_FRICTION');
      assert.strictEqual(result.exitCode, 3, 
        'Friction regression should produce exit code 3');
      
      const frictionRegs = [
        ...(result.comparisons || []),
        ...(result.flowComparisons || [])
      ].filter(c => c.regressionType && c.regressionType.includes('FRICTION'));
      assert.ok(frictionRegs.length > 0, 
        'Should have at least one friction regression');
      
      console.log('    ✅ Detected friction regression');
    }

    // Test 7: Unchanged (SUCCESS → SUCCESS)
    console.log('  Test 7: Unchanged state (SUCCESS → SUCCESS)');
    {
      const baselineName = 'test-unchanged';
      // Save baseline with SUCCESS state
      await runSave(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      // Check with same SUCCESS state
      const result = await runCheck(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      assert.strictEqual(result.overallRegressionVerdict, 'NO_REGRESSION', 
        'SUCCESS→SUCCESS should be NO_REGRESSION');
      assert.strictEqual(result.exitCode, 0, 
        'NO_REGRESSION should have exit code 0');
      
      const unchanged = result.comparisons.filter(c => 
        c.regressionType === 'NO_REGRESSION' && 
        c.baselineOutcome === 'SUCCESS' && 
        c.currentOutcome === 'SUCCESS');
      assert.ok(unchanged.length > 0, 
        'Should have at least one unchanged SUCCESS→SUCCESS');
      
      console.log('    ✅ Detected unchanged state');
    }

    // Test 8: Exit code isolation - baseline verdict does not affect exit code
    console.log('  Test 8: Exit code isolation (baseline regressions affect exit code)');
    {
      const baselineName = 'test-exit-isolation';
      // Save baseline with SUCCESS state
      await runSave(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
      
      // Check with FAILURE state - baseline would indicate regression
      const result = await runCheck(`${fixture.baseUrl}?mode=fail`, artifactsRoot, baselineName, attempts);
      
      // Baseline regressions should drive non-zero exit code
      assert.strictEqual(result.exitCode, 4, 
        'Exit code should reflect regression failure');
      assert.strictEqual(result.overallRegressionVerdict, 'REGRESSION_FAILURE',
        'Baseline verdict correctly shows REGRESSION_FAILURE');
      
      console.log('    ✅ Exit code reflects baseline regression');
    }

    console.log('\n✅ All baseline comparison tests passed');

  } finally {
    await fixture.close();
  }
})();
