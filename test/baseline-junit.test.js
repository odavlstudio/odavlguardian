const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { startFixtureServer } = require('./fixture-server');
const { saveBaseline, checkBaseline } = require('../src/guardian/baseline');

function mkTmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

(async () => {
  console.log('\n🧪 Baseline JUnit Tests');
  const fixture = await startFixtureServer(0);
  try {
    const artifactsRoot = mkTmp('guardian-junit-');
    const baselineDir = path.join(artifactsRoot, 'repo-baselines');
    fs.mkdirSync(baselineDir, { recursive: true });
    const baselineName = 'ok-baseline';
    const attempts = ['contact_form', 'language_switch', 'newsletter_signup'];

    // Save baseline (ok) into baselineDir
    await saveBaseline({ baseUrl: `${fixture.baseUrl}?mode=ok`, artifactsDir: artifactsRoot, baselineDir, name: baselineName, attempts });
    const baselinePath = path.join(baselineDir, `${baselineName}.json`);
    assert.ok(fs.existsSync(baselinePath), 'Baseline file should exist in baselineDir');

    // Check with junit path output in ok->ok
    const junitOk = path.join(artifactsRoot, 'junit', 'guardian.xml');
    const resOk = await checkBaseline({ baseUrl: `${fixture.baseUrl}?mode=ok`, artifactsDir: artifactsRoot, baselineDir, name: baselineName, attempts, junit: junitOk });
    assert.strictEqual(resOk.exitCode, 0);
    assert.ok(fs.existsSync(junitOk), 'JUnit XML should be written');
    const xmlOk = fs.readFileSync(junitOk, 'utf8');
    assert.ok(xmlOk.includes('<testsuite'), 'XML contains testsuite');
    assert.ok(xmlOk.includes('<testcase name="contact_form"'), 'Contains contact_form testcase');
    assert.ok(!xmlOk.includes('<failure'), 'No failure nodes for ok->ok');

    // Check with regressions and ensure failures in XML
    const junitFail = path.join(artifactsRoot, 'junit', 'guardian-fail.xml');
    const resFail = await checkBaseline({ baseUrl: `${fixture.baseUrl}?mode=fail`, artifactsDir: artifactsRoot, baselineDir, name: baselineName, attempts, junit: junitFail });
    assert.strictEqual(resFail.exitCode, 4);
    const xmlFail = fs.readFileSync(junitFail, 'utf8');
    assert.ok(xmlFail.includes('<failure'), 'Failure nodes present');

    console.log('✅ Baseline JUnit tests passed');
  } finally {
    await fixture.close();
  }
})();
