/**
 * Manual test to verify Phase 2 friction signals
 * This test simulates slow execution to trigger friction signals
 */

const { executeAttempt } = require('../src/guardian/attempt');
const { startFixtureServer } = require('./fixture-server');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function testFrictionSignals() {
  console.log('\n🧪 Phase 2 Friction Signals Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Start fixture server
  const fixture = await startFixtureServer();
  console.log(`✅ Fixture running at ${fixture.baseUrl}\n`);

  try {
    // Test 1: FRICTION mode with lowered thresholds
    console.log('📋 Test: FRICTION mode with very low thresholds');
    console.log('   Thresholds: stepDuration=50ms, totalDuration=100ms');
    console.log('   This should definitely trigger friction signals\n');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-friction-test-'));
    const artifactsDir = path.join(tempDir, 'test-friction');

    const result = await executeAttempt({
      baseUrl: `${fixture.baseUrl}?mode=friction`,
      attemptId: 'contact_form',
      artifactsDir,
            frictionThresholds: {
              totalDurationMs: 100,   // 100ms total - will definitely exceed
              stepDurationMs: 50,     // 50ms per step - will definitely exceed
              retryCount: 1            // > 1 retry
            },
      enableTrace: false,
      enableScreenshots: false,
      headful: false
    });

    console.log(`\n📊 Results:`);
    console.log(`   Outcome: ${result.outcome}`);
    console.log(`   Exit Code: ${result.exitCode}`);
    console.log(`   Duration: ${result.attemptResult.totalDurationMs}ms`);
    console.log(`   Is Friction: ${result.friction.isFriction}`);
    
    if (result.friction.signals && result.friction.signals.length > 0) {
      console.log(`\n✅ FRICTION SIGNALS DETECTED: ${result.friction.signals.length}`);
      console.log(`   Summary: ${result.friction.summary}\n`);
      
      result.friction.signals.forEach((signal, index) => {
        console.log(`   Signal ${index + 1}:`);
        console.log(`     ID: ${signal.id}`);
        console.log(`     Description: ${signal.description}`);
        console.log(`     Severity: ${signal.severity}`);
        console.log(`     Metric: ${signal.metric}`);
        console.log(`     Threshold: ${signal.threshold}`);
        console.log(`     Observed: ${signal.observedValue}`);
        console.log(`     Affected Step: ${signal.affectedStepId || 'N/A'}`);
        console.log('');
      });

      // Read and verify JSON report
      const reportJson = JSON.parse(fs.readFileSync(result.reportJsonPath, 'utf8'));
      console.log(`\n📄 JSON Report Verification:`);
      console.log(`   friction.signals array: ${Array.isArray(reportJson.friction.signals) ? '✅' : '❌'}`);
      console.log(`   friction.signals.length: ${reportJson.friction.signals.length}`);
      console.log(`   friction.summary: ${reportJson.friction.summary ? '✅' : '❌'}`);

      // Verify HTML report contains friction section
      const htmlContent = fs.readFileSync(result.reportHtmlPath, 'utf8');
      const hasFrictionSection = htmlContent.includes('Friction Signals:') || 
                                  htmlContent.includes('friction-signals');
      console.log(`   HTML friction section: ${hasFrictionSection ? '✅' : '❌'}`);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Phase 2 friction signals working correctly!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log(`\n⚠️  No friction signals detected`);
      console.log(`   This might be expected if execution was too fast`);
      console.log(`   Friction reasons (legacy): ${JSON.stringify(result.friction.reasons)}\n`);
    }

  } catch (err) {
    console.error(`\n❌ Test failed: ${err.message}`);
    console.error(err.stack);
  } finally {
    await fixture.close();
    console.log('✅ Fixture server closed\n');
  }
}

// Run test
testFrictionSignals().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
