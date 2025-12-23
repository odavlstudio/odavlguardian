/**
 * Guardian Flow Execution Module
 * Executes predefined user interaction flows (click, type, submit, etc.)
 */

const fs = require('fs');
const path = require('path');

class GuardianFlowExecutor {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds per step
    this.screenshotOnStep = options.screenshotOnStep !== false; // Screenshot each step by default
    this.safety = options.safety || null; // Safety guard instance (optional)
  }

  /**
   * Load flow definition from JSON file
   * @param {string} flowPath - Path to flow JSON file
   * @returns {object|null} Flow definition
   */
  loadFlow(flowPath) {
    try {
      const content = fs.readFileSync(flowPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load flow: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute a single flow step
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @param {number} stepIndex - Step index for logging
   * @returns {Promise<object>} { success: boolean, error: string|null }
   */
  async executeStep(page, step, stepIndex) {
    try {
      console.log(`   Step ${stepIndex + 1}: ${step.type} ${step.target || ''}`);

      // Safety check for destructive actions
      if (this.safety) {
        const safetyCheck = this.checkStepSafety(step);
        if (!safetyCheck.safe) {
          return {
            success: false,
            error: `Safety guard blocked step: ${safetyCheck.reason}`,
          };
        }
      }

      switch (step.type) {
        case 'navigate':
          return await this.stepNavigate(page, step);
        
        case 'click':
          return await this.stepClick(page, step);
        
        case 'type':
          return await this.stepType(page, step);
        
        case 'submit':
          return await this.stepSubmit(page, step);
        
        case 'waitFor':
          return await this.stepWaitFor(page, step);
        
        case 'wait':
          return await this.stepWait(page, step);
        
        default:
          return {
            success: false,
            error: `Unknown step type: ${step.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Navigate to URL
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @returns {Promise<object>} Result
   */
  async stepNavigate(page, step) {
    try {
      await page.goto(step.target, {
        timeout: this.timeout,
        waitUntil: 'domcontentloaded',
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Click element
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @returns {Promise<object>} Result
   */
  async stepClick(page, step) {
    try {
      await page.click(step.target, { timeout: this.timeout });
      
      // Wait for navigation if expected
      if (step.waitForNavigation) {
        await page.waitForLoadState('domcontentloaded');
      }
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Type into input field
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @returns {Promise<object>} Result
   */
  async stepType(page, step) {
    try {
      // Clear field first if specified
      if (step.clear !== false) {
        await page.fill(step.target, '');
      }
      
      await page.type(step.target, step.value, {
        timeout: this.timeout,
        delay: step.delay || 50, // Simulate human typing
      });
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit form
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @returns {Promise<object>} Result
   */
  async stepSubmit(page, step) {
    try {
      // Find submit button within form or use provided selector
      if (step.target) {
        await page.click(step.target, { timeout: this.timeout });
      } else {
        // Find first submit button
        await page.click('button[type="submit"]', { timeout: this.timeout });
      }
      
      // Wait for navigation
      await page.waitForLoadState('domcontentloaded');
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for element to appear
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @returns {Promise<object>} Result
   */
  async stepWaitFor(page, step) {
    try {
      await page.waitForSelector(step.target, {
        timeout: step.timeout || this.timeout,
        state: step.state || 'visible',
      });
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for specified time
   * @param {Page} page - Playwright page
   * @param {object} step - Step definition
   * @returns {Promise<object>} Result
   */
  async stepWait(page, step) {
    try {
      const duration = step.duration || 1000;
      await page.waitForTimeout(duration);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if step is safe to execute
   * @param {object} step - Step definition
   * @returns {object} { safe: boolean, reason: string|null }
   */
  checkStepSafety(step) {
    if (!this.safety) {
      return { safe: true, reason: null };
    }

    // Check URL safety for navigate steps
    if (step.type === 'navigate') {
      return this.safety.isUrlSafe(step.target);
    }

    // Check selector safety for click/type steps
    if (step.type === 'click' || step.type === 'type') {
      return this.safety.isSelectorSafe(step.target);
    }

    // Check form submission safety
    if (step.type === 'submit') {
      return this.safety.isFormSubmitSafe(step.target);
    }

    return { safe: true, reason: null };
  }

  /**
   * Execute complete flow
   * @param {Page} page - Playwright page
   * @param {object} flow - Flow definition
   * @param {string} artifactsDir - Directory for screenshots
   * @returns {Promise<object>} Flow result
   */
  async executeFlow(page, flow, artifactsDir, baseUrl = null) {
    const result = {
      flowId: flow.id,
      flowName: flow.name,
      success: false,
      stepsExecuted: 0,
      stepsTotal: flow.steps.length,
      failedStep: null,
      error: null,
      screenshots: [],
      durationMs: 0
    };

    // Normalize steps with optional baseUrl substitution
    const steps = (flow.steps || []).map((step) => {
      if (baseUrl && typeof step.target === 'string' && step.target.includes('$BASEURL')) {
        return { ...step, target: step.target.replace('$BASEURL', baseUrl) };
      }
      return step;
    });

    // Ensure artifact subfolder exists for screenshots
    if (artifactsDir) {
      const pagesDir = path.join(artifactsDir, 'pages');
      fs.mkdirSync(pagesDir, { recursive: true });
    }

    let startedAt = Date.now();
    try {
      console.log(`\n🎬 Executing flow: ${flow.name}`);
      console.log(`📋 Steps: ${steps.length}`);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Execute step
        const stepResult = await this.executeStep(page, step, i);
        
        // Capture screenshot after step
        if (this.screenshotOnStep && artifactsDir) {
          const screenshotPath = path.join(
            artifactsDir,
            'pages',
            `flow-step-${i + 1}.jpeg`
          );
          
          try {
            await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 80 });
            result.screenshots.push(`flow-step-${i + 1}.jpeg`);
          } catch (error) {
            console.error(`⚠️  Failed to capture screenshot: ${error.message}`);
          }
        }

        // Check if step failed
        if (!stepResult.success) {
          result.failedStep = i + 1;
          result.error = stepResult.error;
          console.log(`   ❌ Step failed: ${stepResult.error}`);
          return result;
        }

        result.stepsExecuted++;
        console.log(`   ✅ Step ${i + 1} completed`);
      }

      result.success = true;
      result.durationMs = Date.now() - startedAt;
      console.log(`✅ Flow completed successfully`);
      
      return result;
    } catch (error) {
      if (!result.durationMs) {
        result.durationMs = Date.now() - (startedAt || Date.now());
      }
      result.error = error.message;
      console.error(`❌ Flow execution failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate flow definition
   * @param {object} flow - Flow definition
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validateFlow(flow) {
    const errors = [];

    if (!flow.id) {
      errors.push('Flow missing required field: id');
    }

    if (!flow.name) {
      errors.push('Flow missing required field: name');
    }

    if (!flow.steps || !Array.isArray(flow.steps)) {
      errors.push('Flow missing required field: steps (must be array)');
    } else if (flow.steps.length === 0) {
      errors.push('Flow has no steps');
    } else {
      // Validate each step
      flow.steps.forEach((step, index) => {
        if (!step.type) {
          errors.push(`Step ${index + 1}: missing type`);
        }

        const validTypes = ['navigate', 'click', 'type', 'submit', 'waitFor', 'wait'];
        if (step.type && !validTypes.includes(step.type)) {
          errors.push(`Step ${index + 1}: invalid type "${step.type}"`);
        }

        if ((step.type === 'navigate' || step.type === 'click' || step.type === 'type' || step.type === 'waitFor') && !step.target) {
          errors.push(`Step ${index + 1}: missing target`);
        }

        if (step.type === 'type' && !step.value) {
          errors.push(`Step ${index + 1}: missing value for type step`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = { GuardianFlowExecutor };
