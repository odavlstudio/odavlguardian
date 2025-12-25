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
  console.log('\n🧪 Baseline Tests');

  const fixture = await startFixtureServer(0);
  try {
    // TEMP artifacts root for tests
    const artifactsRoot = mkTmp('guardian-baseline-');
    const baselineName = 'test-baseline';
    const attempts = ['contact_form', 'language_switch', 'newsletter_signup'];

    // A) Save baseline (ok)
    const saveRes = await runSave(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
    const baselinePath = path.join(artifactsRoot, 'baselines', `${baselineName}.json`);
    assert.strictEqual(saveRes.exitCode, 0, 'Baseline save should exit 0');
    assert.ok(fs.existsSync(baselinePath), 'Baseline file should exist');
    const snapshot = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.strictEqual(snapshot.schemaVersion, 1, 'schemaVersion should be 1');
    assert.strictEqual(snapshot.baselineName, baselineName);
    assert.strictEqual(snapshot.overallVerdict, 'SUCCESS');

    // B) Check baseline ok -> ok (NO_REGRESSION)
    const checkOk = await runCheck(`${fixture.baseUrl}?mode=ok`, artifactsRoot, baselineName, attempts);
    assert.strictEqual(checkOk.overallRegressionVerdict, 'NO_REGRESSION');
    assert.strictEqual(checkOk.exitCode, 0);
    assert.ok(fs.existsSync(path.join(checkOk.runDir, 'baseline-check-report.json')));
    assert.ok(fs.existsSync(path.join(checkOk.runDir, 'baseline-check-report.html')));

    // C) Check baseline ok -> fail (REGRESSION_FAILURE)
    const checkFail = await runCheck(`${fixture.baseUrl}?mode=fail`, artifactsRoot, baselineName, attempts);
    assert.strictEqual(checkFail.overallRegressionVerdict, 'REGRESSION_FAILURE');
    assert.strictEqual(checkFail.exitCode, 0, 'Baseline exit code is always 0 (flows-only policy)');
    const failJson = JSON.parse(fs.readFileSync(path.join(checkFail.runDir, 'baseline-check-report.json'), 'utf8'));
    assert.ok(Array.isArray(failJson.comparisons));

    // D) Check baseline ok -> friction (REGRESSION_FRICTION)
    const checkFriction = await runCheck(`${fixture.baseUrl}?mode=friction`, artifactsRoot, baselineName, attempts);
    assert.strictEqual(checkFriction.overallRegressionVerdict, 'REGRESSION_FRICTION');
    assert.strictEqual(checkFriction.exitCode, 0, 'Baseline exit code is always 0 (flows-only policy)');

    console.log('✅ Baseline tests passed');
  } finally {
    await fixture.close();
  }
})();
