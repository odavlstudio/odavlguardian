/**
 * Guardian Phase 1 Attempt Tests
 * Tests the single user attempt functionality using programmatic API
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { startFixtureServer } = require('./fixture-server');
const { executeAttempt } = require('../src/guardian/attempt');

async function runTests() {
  console.log('\n🧪 Guardian Phase 1 Attempt Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Start fixture server
  console.log('🔨 Starting fixture server...');
  const fixture = await startFixtureServer();
  console.log(`✅ Fixture running at ${fixture.baseUrl}`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-attempt-'));
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: OK mode (SUCCESS)
    console.log('\n📋 Test 1: OK mode - SUCCESS outcome');
    try {
      const artifactsDir = path.join(tempDir, 'test1-ok');
      const result = await executeAttempt({
        baseUrl: `${fixture.baseUrl}?mode=ok`,
        attemptId: 'contact_form',
        artifactsDir,
        enableTrace: false, // Disable for speed
        enableScreenshots: false,
        headful: false
      });

      // Assert outcome
      assert.strictEqual(result.outcome, 'SUCCESS', 'Outcome should be SUCCESS');
      assert.strictEqual(result.exitCode, 0, 'Exit code should be 0 for SUCCESS');
      
      // Assert artifacts exist
      assert.ok(fs.existsSync(result.reportJsonPath), 'JSON report should exist');
      assert.ok(fs.existsSync(result.reportHtmlPath), 'HTML report should exist');
      
      // Assert JSON structure
      const reportJson = JSON.parse(fs.readFileSync(result.reportJsonPath, 'utf8'));
      assert.strictEqual(reportJson.outcome, 'SUCCESS', 'JSON report should have SUCCESS outcome');
      assert.ok(Array.isArray(reportJson.steps), 'JSON report should have steps array');
      assert.ok(reportJson.steps.length > 0, 'Should have at least one step');
      assert.ok(reportJson.attemptId, 'Should have attemptId');
      assert.ok(reportJson.timestamp, 'Should have timestamp');
      
      // Phase 2: Validate friction signals for SUCCESS
      assert.ok(reportJson.friction, 'Friction object should exist in report');
      assert.ok(Array.isArray(reportJson.friction.signals), 'Friction signals should be an array');
      assert.strictEqual(reportJson.friction.signals.length, 0, 
        'SUCCESS should have zero friction signals');
      assert.strictEqual(reportJson.friction.summary, null, 
        'SUCCESS should have null friction summary');
      assert.strictEqual(reportJson.friction.isFriction, false, 
        'isFriction should be false for SUCCESS');
      
      // Assert HTML exists and has content
      const htmlContent = fs.readFileSync(result.reportHtmlPath, 'utf8');
      assert.ok(htmlContent.includes('SUCCESS'), 'HTML should mention SUCCESS');
      assert.ok(htmlContent.includes('Guardian Attempt Report'), 'HTML should have title');

      console.log(`✅ OK mode test passed (zero friction signals)`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
      console.error(err.stack);
      testsFailed++;
    }

    // Test 2: FAIL mode (FAILURE)
    console.log('\n📋 Test 2: FAIL mode - FAILURE outcome');
    try {
      const artifactsDir = path.join(tempDir, 'test2-fail');
      const result = await executeAttempt({
        baseUrl: `${fixture.baseUrl}?mode=fail`,
        attemptId: 'contact_form',
        artifactsDir,
        enableTrace: false,
        enableScreenshots: false,
        headful: false
      });

      // Assert outcome
      assert.strictEqual(result.outcome, 'FAILURE', 'Outcome should be FAILURE');
      assert.strictEqual(result.exitCode, 1, 'Exit code should be 1 for FAILURE');
      
      // Assert error is set
      assert.ok(result.error, 'Error should be set for FAILURE');
      
      // Assert artifacts exist
      assert.ok(fs.existsSync(result.reportJsonPath), 'JSON report should exist');
      assert.ok(fs.existsSync(result.reportHtmlPath), 'HTML report should exist');
      
      // Assert JSON structure
      const reportJson = JSON.parse(fs.readFileSync(result.reportJsonPath, 'utf8'));
      assert.strictEqual(reportJson.outcome, 'FAILURE', 'JSON report should have FAILURE outcome');
      assert.ok(reportJson.error, 'JSON report should have error message');

      console.log(`✅ FAIL mode test passed`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
      console.error(err.stack);
      testsFailed++;
    }

    // Test 3: FRICTION mode (FRICTION)
    console.log('\n📋 Test 3: FRICTION mode - FRICTION outcome');
    try {
      const artifactsDir = path.join(tempDir, 'test3-friction');
      const result = await executeAttempt({
        baseUrl: `${fixture.baseUrl}?mode=friction`,
        attemptId: 'contact_form',
        artifactsDir,
        enableTrace: false,
        enableScreenshots: false,
        headful: false
      });

      // For friction mode, we expect either SUCCESS or FRICTION
      // depending on whether the 1000ms delay triggers our thresholds
      assert.ok(['SUCCESS', 'FRICTION'].includes(result.outcome), 
        `Outcome should be SUCCESS or FRICTION, got ${result.outcome}`);
      
      if (result.outcome === 'FRICTION') {
        assert.strictEqual(result.exitCode, 2, 'Exit code should be 2 for FRICTION');
        assert.ok(result.friction, 'Friction object should exist');
        assert.ok(result.friction.isFriction, 'isFriction should be true');
        
        // Phase 2: Validate friction signals structure
        assert.ok(Array.isArray(result.friction.signals), 'Friction signals should be an array');
        assert.ok(result.friction.signals.length > 0, 'Should have at least one friction signal');
        
        // Validate signal structure
        const firstSignal = result.friction.signals[0];
        assert.ok(firstSignal.id, 'Signal should have id');
        assert.ok(firstSignal.description, 'Signal should have description');
        assert.ok(firstSignal.metric, 'Signal should have metric');
        assert.ok(typeof firstSignal.threshold === 'number', 'Signal should have numeric threshold');
        assert.ok(typeof firstSignal.observedValue === 'number', 'Signal should have numeric observedValue');
        assert.ok(firstSignal.severity, 'Signal should have severity');
        assert.ok(['low', 'medium', 'high'].includes(firstSignal.severity), 
          `Severity should be low/medium/high, got ${firstSignal.severity}`);
        
        // Validate summary exists
        assert.ok(result.friction.summary, 'Friction summary should exist');
        assert.ok(typeof result.friction.summary === 'string', 'Friction summary should be a string');
        
        // Backward compatibility: reasons array should still exist
        assert.ok(Array.isArray(result.friction.reasons), 'Friction reasons should be array');
        assert.ok(result.friction.reasons.length > 0, 'Should have at least one friction reason');
        
        console.log(`✅ FRICTION mode test passed (detected ${result.friction.signals.length} friction signal(s))`);
        console.log(`   Summary: ${result.friction.summary}`);
      } else {
        // If SUCCESS, that's also valid if the delay didn't exceed thresholds
        assert.strictEqual(result.exitCode, 0, 'Exit code should be 0 for SUCCESS');
        
        // Phase 2: Validate empty signals for SUCCESS
        assert.ok(Array.isArray(result.friction.signals), 'Friction signals should be an array even for SUCCESS');
        assert.strictEqual(result.friction.signals.length, 0, 'SUCCESS should have zero friction signals');
        assert.strictEqual(result.friction.summary, null, 'SUCCESS should have null summary');
        
        console.log(`✅ FRICTION mode test passed (completed successfully, no friction detected)`);
      }
      
      // Assert artifacts exist regardless
      assert.ok(fs.existsSync(result.reportJsonPath), 'JSON report should exist');
      assert.ok(fs.existsSync(result.reportHtmlPath), 'HTML report should exist');

      testsPassed++;
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
      console.error(err.stack);
      testsFailed++;
    }

    // Test 4: Artifact generation with screenshots/trace enabled
    console.log('\n📋 Test 4: Artifact generation (screenshots and trace)');
    try {
      const artifactsDir = path.join(tempDir, 'test4-artifacts');
      const result = await executeAttempt({
        baseUrl: `${fixture.baseUrl}?mode=ok`,
        attemptId: 'contact_form',
        artifactsDir,
        enableTrace: true,
        enableScreenshots: true,
        headful: false
      });

      // Assert basic success
      assert.ok(['SUCCESS', 'FAILURE'].includes(result.outcome), 'Should complete with outcome');
      
      // Assert artifacts exist
      assert.ok(fs.existsSync(result.reportJsonPath), 'JSON report should exist');
      assert.ok(fs.existsSync(result.reportHtmlPath), 'HTML report should exist');
      
      // Assert trace exists (if enabled)
      if (result.tracePath) {
        assert.ok(fs.existsSync(result.tracePath), 'Trace file should exist');
      }
      
      // Check for screenshots directory
      const screenshotsDir = path.join(result.artifactsDir, 'attempt-screenshots');
      if (result.outcome === 'SUCCESS') {
        // Screenshots might exist if steps succeeded
        if (fs.existsSync(screenshotsDir)) {
          const screenshots = fs.readdirSync(screenshotsDir);
          console.log(`   Found ${screenshots.length} screenshots`);
        }
      }

      console.log(`✅ Artifact generation test passed`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
      console.error(err.stack);
      testsFailed++;
    }

    // Test 5: Invalid URL handling
    console.log('\n📋 Test 5: Invalid URL handling');
    try {
      let errorThrown = false;
      try {
        await executeAttempt({
          baseUrl: 'not-a-valid-url',
          attemptId: 'contact_form',
          artifactsDir: path.join(tempDir, 'test5-invalid'),
          enableTrace: false,
          enableScreenshots: false,
          headful: false
        });
      } catch (err) {
        errorThrown = true;
        assert.ok(err.message.includes('Invalid URL') || err.message.includes('Invalid'), 
          'Should throw error about invalid URL');
      }
      
      assert.ok(errorThrown, 'Should throw error for invalid URL');
      console.log(`✅ Invalid URL handling test passed`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
      console.error(err.stack);
      testsFailed++;
    }

    // Test 6: Report JSON schema validation
    console.log('\n📋 Test 6: Report JSON schema validation');
    try {
      const artifactsDir = path.join(tempDir, 'test6-schema');
      const result = await executeAttempt({
        baseUrl: `${fixture.baseUrl}?mode=ok`,
        attemptId: 'contact_form',
        artifactsDir,
        enableTrace: false,
        enableScreenshots: false,
        headful: false
      });

      const reportJson = JSON.parse(fs.readFileSync(result.reportJsonPath, 'utf8'));
      
      // Validate required fields
      assert.ok(reportJson.version, 'Should have version');
      assert.ok(reportJson.runId, 'Should have runId');
      assert.ok(reportJson.timestamp, 'Should have timestamp');
      assert.ok(reportJson.attemptId, 'Should have attemptId');
      assert.ok(reportJson.outcome, 'Should have outcome');
      assert.ok(Array.isArray(reportJson.steps), 'Should have steps array');
      assert.ok(reportJson.friction, 'Should have friction object');
      assert.ok(typeof reportJson.friction.isFriction === 'boolean', 'friction.isFriction should be boolean');
      assert.ok(Array.isArray(reportJson.friction.reasons), 'friction.reasons should be array');
      
      // Validate step structure
      if (reportJson.steps.length > 0) {
        const step = reportJson.steps[0];
        assert.ok(step.id, 'Step should have id');
        assert.ok(step.type, 'Step should have type');
        assert.ok(step.status, 'Step should have status');
        assert.ok(typeof step.durationMs === 'number', 'Step should have numeric durationMs');
      }

      console.log(`✅ JSON schema validation test passed`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
      console.error(err.stack);
      testsFailed++;
    }

  } finally {
    // Cleanup
    console.log('\n✅ Fixture server closed');
    await fixture.close();

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\n❌ Test suite error:', err);
  process.exit(1);
});
