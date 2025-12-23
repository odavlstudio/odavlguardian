/**
 * Guardian Attempt Engine - PHASE 1 + PHASE 2
 * Executes a single user attempt and tracks outcome (SUCCESS, FAILURE, FRICTION)
 * Phase 2: Soft failure detection via validators
 */

const fs = require('fs');
const path = require('path');
const { getAttemptDefinition } = require('./attempt-registry');
const { runValidators, analyzeSoftFailures } = require('./validators');

class AttemptEngine {
  constructor(options = {}) {
    this.attemptId = options.attemptId || 'default';
    this.timeout = options.timeout || 30000;
    this.frictionThresholds = options.frictionThresholds || {
      totalDurationMs: 2500, // Total attempt > 2.5s
      stepDurationMs: 1500,   // Any single step > 1.5s
      retryCount: 1            // More than 1 retry = friction
    };
  }

  /**
   * Load attempt definition by ID (Phase 3 registry)
   */
  loadAttemptDefinition(attemptId) {
    return getAttemptDefinition(attemptId);
  }

  /**
   * Execute a single attempt
   * Returns: { outcome, steps, timings, friction, error, validators, softFailures }
   */
  async executeAttempt(page, attemptId, baseUrl, artifactsDir = null, validatorSpecs = null) {
    const attemptDef = this.loadAttemptDefinition(attemptId);
    if (!attemptDef) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    const startedAt = new Date();
    const steps = [];
    const frictionSignals = [];
    const consoleMessages = []; // Capture console messages for validators
    let currentStep = null;
    let lastError = null;
    let frictionReasons = [];
    let frictionMetrics = {};

    // Capture console messages for soft failure detection
    const consoleHandler = (msg) => {
      consoleMessages.push({
        type: msg.type(), // 'log', 'error', 'warning', etc.
        text: msg.text(),
        location: msg.location()
      });
    };

    page.on('console', consoleHandler);

    try {
      // Replace $BASEURL placeholder in all steps
      const processedSteps = attemptDef.baseSteps.map(step => {
        if (step.target && step.target === '$BASEURL') {
          return { ...step, target: baseUrl };
        }
        return step;
      });

      // Execute each step
      for (const stepDef of processedSteps) {
        currentStep = {
          id: stepDef.id,
          type: stepDef.type,
          target: stepDef.target,
          description: stepDef.description,
          startedAt: new Date().toISOString(),
          retries: 0,
          status: 'pending',
          error: null,
          screenshots: []
        };

        const stepStartTime = Date.now();

        try {
          // Execute with retry logic (up to 2 attempts)
          let success = false;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              if (attempt > 0) {
                currentStep.retries++;
                // Small backoff before retry
                await page.waitForTimeout(200);
              }

              await this._executeStep(page, stepDef);
              success = true;
              break;
            } catch (err) {
              if (attempt === 1) {
                throw err; // Final attempt failed
              }
              // Retry on first failure
            }
          }

          const stepEndTime = Date.now();
          const stepDurationMs = stepEndTime - stepStartTime;

          currentStep.endedAt = new Date().toISOString();
          currentStep.durationMs = stepDurationMs;
          currentStep.status = 'success';

          // Check for friction signals in step timing
          if (stepDurationMs > this.frictionThresholds.stepDurationMs) {
            frictionSignals.push({
              id: 'slow_step_execution',
              description: `Step took longer than threshold`,
              metric: 'stepDurationMs',
              threshold: this.frictionThresholds.stepDurationMs,
              observedValue: stepDurationMs,
              affectedStepId: stepDef.id,
              severity: 'medium'
            });
            frictionReasons.push(`Step "${stepDef.id}" took ${stepDurationMs}ms (threshold: ${this.frictionThresholds.stepDurationMs}ms)`);
          }

          if (currentStep.retries > this.frictionThresholds.retryCount) {
            frictionSignals.push({
              id: 'multiple_retries_required',
              description: `Step required multiple retry attempts`,
              metric: 'retryCount',
              threshold: this.frictionThresholds.retryCount,
              observedValue: currentStep.retries,
              affectedStepId: stepDef.id,
              severity: 'high'
            });
            frictionReasons.push(`Step "${stepDef.id}" required ${currentStep.retries} retries`);
          }

          // Capture screenshot on success if artifacts dir provided
          if (artifactsDir) {
            const screenshotPath = await this._captureScreenshot(
              page,
              artifactsDir,
              stepDef.id
            );
            if (screenshotPath) {
              currentStep.screenshots.push(screenshotPath);
            }
          }

        } catch (err) {
          currentStep.endedAt = new Date().toISOString();
          currentStep.durationMs = Date.now() - stepStartTime;
          currentStep.status = stepDef.optional ? 'skipped' : 'failed';
          currentStep.error = err.message;

          if (stepDef.optional) {
            // Optional steps should not fail the attempt; record and move on
            steps.push(currentStep);
            continue;
          }

          lastError = err;

          // Capture screenshot on failure
          if (artifactsDir) {
            const screenshotPath = await this._captureScreenshot(
              page,
              artifactsDir,
              `${stepDef.id}_failure`
            );
            if (screenshotPath) {
              currentStep.screenshots.push(screenshotPath);
            }
          }

          throw err; // Stop attempt on step failure
        }

        steps.push(currentStep);
      }

      // All steps successful, now check success conditions
      const endedAt = new Date();
      const totalDurationMs = endedAt.getTime() - startedAt.getTime();

      // Check success conditions
      let successMet = false;
      let successReason = null;

      for (const condition of attemptDef.successConditions) {
        try {
          if (condition.type === 'url') {
            const currentUrl = page.url();
            if (condition.pattern.test(currentUrl)) {
              successMet = true;
              successReason = `URL matched: ${currentUrl}`;
              break;
            }
          } else if (condition.type === 'selector') {
            // Wait briefly for selector to become visible
            try {
              await page.waitForSelector(condition.target, { timeout: 3000, state: 'visible' });
              successMet = true;
              successReason = `Success element visible: ${condition.target}`;
              break;
            } catch (e) {
              // Continue to next condition
            }
          }
        } catch (err) {
          // Continue to next condition
        }
      }

      if (!successMet) {
        page.removeListener('console', consoleHandler);
        return {
          outcome: 'FAILURE',
          steps,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          totalDurationMs,
          friction: {
            isFriction: false,
            signals: [],
            summary: null,
            reasons: [],
            thresholds: this.frictionThresholds,
            metrics: {}
          },
          error: 'Success conditions not met after all steps completed',
          successReason: null,
          validators: [],
          softFailures: { hasSoftFailure: false, failureCount: 0, warnCount: 0 }
        };
      }

      // Run validators for soft failure detection (Phase 2)
      let validatorResults = [];
      let softFailureAnalysis = { hasSoftFailure: false, failureCount: 0, warnCount: 0 };

      if (validatorSpecs && validatorSpecs.length > 0) {
        const validatorContext = {
          page,
          consoleMessages,
          url: page.url()
        };

        validatorResults = await runValidators(validatorSpecs, validatorContext);
        softFailureAnalysis = analyzeSoftFailures(validatorResults);

        // If validators detected soft failures, upgrade outcome
        if (softFailureAnalysis.hasSoftFailure) {
          // Soft failure still counts as FAILURE (outcome), not FRICTION
          // Soft failures are recorded separately for analysis
        }
      }

      // Check for friction signals in total duration
      if (totalDurationMs > this.frictionThresholds.totalDurationMs) {
        frictionSignals.push({
          id: 'slow_total_duration',
          description: `Total attempt duration exceeded threshold`,
          metric: 'totalDurationMs',
          threshold: this.frictionThresholds.totalDurationMs,
          observedValue: totalDurationMs,
          affectedStepId: null,
          severity: 'low'
        });
        frictionReasons.push(`Attempt took ${totalDurationMs}ms total (threshold: ${this.frictionThresholds.totalDurationMs}ms)`);
      }

      frictionMetrics = {
        totalDurationMs,
        stepCount: steps.length,
        totalRetries: steps.reduce((sum, s) => sum + s.retries, 0),
        maxStepDurationMs: Math.max(...steps.map(s => s.durationMs || 0))
      };

      // Determine outcome based on friction signals
      const isFriction = frictionSignals.length > 0;
      const outcome = isFriction ? 'FRICTION' : 'SUCCESS';

      // Generate friction summary
      const frictionSummary = isFriction 
        ? `User succeeded, but encountered ${frictionSignals.length} friction ${frictionSignals.length === 1 ? 'signal' : 'signals'}` 
        : null;

      return {
        outcome,
        steps,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        totalDurationMs,
        friction: {
          isFriction,
          signals: frictionSignals,
          summary: frictionSummary,
          reasons: frictionReasons, // Keep for backward compatibility
          thresholds: this.frictionThresholds,
          metrics: frictionMetrics
        },
        error: null,
        successReason,
        validators: validatorResults,
        softFailures: softFailureAnalysis
      };

    } catch (err) {
      const endedAt = new Date();
      page.removeListener('console', consoleHandler);
      return {
        outcome: 'FAILURE',
        steps,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        totalDurationMs: endedAt.getTime() - startedAt.getTime(),
        friction: {
          isFriction: false,
          reasons: [],
          thresholds: this.frictionThresholds,
          metrics: {}
        },
        error: `Step "${currentStep?.id}" failed: ${err.message}`,
        successReason: null,
        validators: [],
        softFailures: { hasSoftFailure: false, failureCount: 0, warnCount: 0 }
      };
    } finally {
      page.removeListener('console', consoleHandler);
    }
  }

  /**
   * Execute a single step
   */
  async _executeStep(page, stepDef) {
    const timeout = stepDef.timeout || this.timeout;

    switch (stepDef.type) {
      case 'navigate':
        await page.goto(stepDef.target, {
          waitUntil: 'domcontentloaded',
          timeout
        });
        break;

      case 'click':
        // Try each selector in the target (semicolon-separated)
        const selectors = stepDef.target.split(',').map(s => s.trim());
        let clicked = false;

        for (const selector of selectors) {
          try {
            await page.click(selector, { timeout: 5000 });
            clicked = true;
            break;
          } catch (err) {
            // Try next selector
          }
        }

        if (!clicked) {
          throw new Error(`Could not click element: ${stepDef.target}`);
        }

        // Wait for navigation if expected
        if (stepDef.waitForNavigation) {
          await page.waitForLoadState('domcontentloaded').catch(() => {});
        }
        break;

      case 'type':
        // Try each selector
        const typeSelectors = stepDef.target.split(',').map(s => s.trim());
        let typed = false;

        for (const selector of typeSelectors) {
          try {
            await page.fill(selector, stepDef.value, { timeout: 5000 });
            typed = true;
            break;
          } catch (err) {
            // Try next selector
          }
        }

        if (!typed) {
          throw new Error(`Could not type into element: ${stepDef.target}`);
        }
        break;

      case 'waitFor':
        const waitSelectors = stepDef.target.split(',').map(s => s.trim());
        let found = false;

        for (const selector of waitSelectors) {
          try {
            await page.waitForSelector(selector, {
              timeout: stepDef.timeout || 5000,
              state: stepDef.state || 'visible'
            });
            found = true;
            break;
          } catch (err) {
            // Try next selector
          }
        }

        if (!found) {
          throw new Error(`Element not found: ${stepDef.target}`);
        }
        break;

      case 'wait':
        await page.waitForTimeout(stepDef.duration || 1000);
        break;

      default:
        throw new Error(`Unknown step type: ${stepDef.type}`);
    }
  }

  /**
   * Capture screenshot
   */
  async _captureScreenshot(page, artifactsDir, stepId) {
    try {
      const screenshotsDir = path.join(artifactsDir, 'attempt-screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filename = `${stepId}.jpeg`;
      const fullPath = path.join(screenshotsDir, filename);

      await page.screenshot({
        path: fullPath,
        type: 'jpeg',
        quality: 80,
        fullPage: true
      });

      return filename;
    } catch (err) {
      return null;
    }
  }
}

module.exports = { AttemptEngine };
