/**
 * Guardian Attempt Mode
 * Single user attempt execution orchestration
 * Phase 2: Soft failure detection via validators
 */

const { GuardianBrowser } = require('./browser');
const { AttemptEngine } = require('./attempt-engine');
const { AttemptReporter } = require('./attempt-reporter');
const { getAttemptDefinition } = require('./attempt-registry');
const GuardianNetworkTrace = require('./network-trace');
const fs = require('fs');
const path = require('path');

/**
 * Programmatic API for executing attempts
 * Returns result object instead of calling process.exit
 * @param {Object} config - Configuration
 * @returns {Promise<Object>} Result with outcome, exitCode, paths, etc.
 */
async function executeAttempt(config) {
  const {
    baseUrl,
    attemptId = 'contact_form',
    artifactsDir = './artifacts',
    enableTrace = true,
    enableScreenshots = true,
    headful = false
  } = config;

  // Validate baseUrl
  try {
    new URL(baseUrl);
  } catch (e) {
    throw new Error(`Invalid URL: ${baseUrl}`);
  }

  const browser = new GuardianBrowser();
  let attemptResult = null;
  let runDir = null;

  try {
    // Prepare artifacts directory
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[:\-]/g, '')
      .substring(0, 15)
      .replace('T', '-');
    const runId = `attempt-${dateStr}`;
    runDir = path.join(artifactsDir, runId);

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    console.log(`\n📁 Artifacts: ${runDir}`);

    // Launch browser
    console.log(`\n🚀 Launching browser...`);
    const browserOptions = { 
      headless: !headful,
      args: !headful ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
    };
    await browser.launch(30000, browserOptions);
    console.log(`✅ Browser launched`);

    // Start trace if enabled
    let tracePath = null;
    if (enableTrace && browser.context) {
      const networkTrace = new GuardianNetworkTrace({ enableTrace: true });
      tracePath = await networkTrace.startTrace(browser.context, runDir);
      if (tracePath) {
        console.log(`📹 Trace recording started`);
      }
    }

    // Execute attempt
    console.log(`\n🎬 Executing attempt...`);
    const engine = new AttemptEngine({
      attemptId,
      timeout: config.timeout || 30000,
      frictionThresholds: config.frictionThresholds || {
        totalDurationMs: 2500,
        stepDurationMs: 1500,
        retryCount: 1
      }
    });

    // Get validators from attempt definition (Phase 2)
    const attemptDef = getAttemptDefinition(attemptId);
    const validators = attemptDef?.validators || [];

    attemptResult = await engine.executeAttempt(browser.page, attemptId, baseUrl, runDir, validators);

    console.log(`\n✅ Attempt completed: ${attemptResult.outcome}`);

    // Stop trace if enabled
    if (enableTrace && browser.context && tracePath) {
      const networkTrace = new GuardianNetworkTrace({ enableTrace: true });
      await networkTrace.stopTrace(browser.context, tracePath);
      console.log(`✅ Trace saved: trace.zip`);
    }

    // Generate reports
    console.log(`\n📊 Generating reports...`);
    const reporter = new AttemptReporter();
    const report = reporter.createReport(attemptResult, baseUrl, attemptId);

    // Save JSON report
    const jsonPath = reporter.saveJsonReport(report, runDir);
    console.log(`✅ JSON report: ${path.basename(jsonPath)}`);

    // Save HTML report
    const htmlContent = reporter.generateHtmlReport(report);
    const htmlPath = reporter.saveHtmlReport(htmlContent, runDir);
    console.log(`✅ HTML report: ${path.basename(htmlPath)}`);

    // Display summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const outcomeEmoji = attemptResult.outcome === 'SUCCESS' ? '🟢' : 
                          attemptResult.outcome === 'FRICTION' ? '🟡' : '🔴';

    console.log(`\n${outcomeEmoji} ${attemptResult.outcome}`);

    if (attemptResult.outcome === 'SUCCESS') {
      console.log(`\n✅ User successfully completed the attempt!`);
      console.log(`   ${attemptResult.successReason}`);
    } else if (attemptResult.outcome === 'FRICTION') {
      console.log(`\n⚠️  Attempt succeeded but with friction:`);
      attemptResult.friction.reasons.forEach(reason => {
        console.log(`   • ${reason}`);
      });
    } else {
      console.log(`\n❌ Attempt failed:`);
      console.log(`   ${attemptResult.error}`);
    }

    console.log(`\n⏱️  Duration: ${attemptResult.totalDurationMs}ms`);
    console.log(`📋 Steps: ${attemptResult.steps.length}`);

    if (attemptResult.steps.length > 0) {
      const failedSteps = attemptResult.steps.filter(s => s.status === 'failed');
      if (failedSteps.length > 0) {
        console.log(`❌ Failed steps: ${failedSteps.length}`);
        failedSteps.forEach(step => {
          console.log(`   • ${step.id}: ${step.error}`);
        });
      }

      const retriedSteps = attemptResult.steps.filter(s => s.retries > 0);
      if (retriedSteps.length > 0) {
        console.log(`🔄 Steps with retries: ${retriedSteps.length}`);
        retriedSteps.forEach(step => {
          console.log(`   • ${step.id}: ${step.retries} retries`);
        });
      }
    }

    console.log(`\n💾 Full report: ${runDir}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Close browser before returning
    try {
      await browser.close();
    } catch (closeErr) {
      // Ignore browser close errors
    }

    // Determine exit code
    let exitCode = 0;
    if (attemptResult.outcome === 'SUCCESS') {
      exitCode = 0;
    } else if (attemptResult.outcome === 'FRICTION') {
      exitCode = 2;
    } else {
      exitCode = 1;
    }

    // Return structured result
    return {
      outcome: attemptResult.outcome,
      exitCode,
      attemptResult,
      artifactsDir: runDir,
      reportJsonPath: path.join(runDir, 'attempt-report.json'),
      reportHtmlPath: path.join(runDir, 'attempt-report.html'),
      tracePath: enableTrace ? path.join(runDir, 'trace.zip') : null,
      steps: attemptResult.steps,
      friction: attemptResult.friction,
      error: attemptResult.error,
      successReason: attemptResult.successReason
    };

  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

/**
 * CLI wrapper for executeAttempt that prints output and calls process.exit
 */
async function runAttemptCLI(config) {
  const {
    baseUrl,
    attemptId = 'contact_form',
    headful = false
  } = config;

  console.log(`\n🛡️  ODAVL Guardian — Single User Attempt (Phase 1)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Target: ${baseUrl}`);
  console.log(`🎯 Attempt: ${attemptId}`);
  console.log(`⚙️  Mode: ${headful ? 'headed' : 'headless'}`);

  try {
    const result = await executeAttempt(config);
    process.exit(result.exitCode);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { executeAttempt, runAttemptCLI };
