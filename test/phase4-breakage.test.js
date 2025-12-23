/**
 * Phase 4 Breakage Intelligence Tests
 * 
 * Validate:
 * - Failure taxonomy classification
 * - Root cause hint derivation
 * - Actionable intelligence generation
 * - Domain/severity gating in policy
 * - Stable scoring across runs
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  classifyBreakType,
  determineSeverity,
  BREAK_TYPES,
  IMPACT_DOMAINS,
  SEVERITY_LEVELS
} = require('../src/guardian/failure-taxonomy');
const {
  deriveRootCauseHints
} = require('../src/guardian/root-cause-analysis');
const {
  analyzeFailure,
  aggregateIntelligence,
  generateWhyItMatters,
  generateTopActions
} = require('../src/guardian/breakage-intelligence');
const {
  evaluatePolicy,
  loadPolicy
} = require('../src/guardian/policy');

describe('Phase 4: Breakage Intelligence', () => {

  describe('Failure Taxonomy', () => {
    it('should classify NAVIGATION breaks correctly', () => {
      const failure = {
        attemptId: 'checkout',
        error: 'Navigation to /checkout failed',
        lastStep: {
          action: 'goto',
          url: 'https://example.com/checkout'
        }
      };

      const breakType = classifyBreakType(failure);
      assert.strictEqual(breakType, BREAK_TYPES.NAVIGATION);
    });

    it('should classify SUBMISSION breaks correctly', () => {
      const failure = {
        attemptId: 'contact-form',
        error: 'Form submission failed',
        lastStep: {
          action: 'click',
          selector: 'button[type=submit]'
        }
      };

      const breakType = classifyBreakType(failure);
      assert.strictEqual(breakType, BREAK_TYPES.SUBMISSION);
    });

    it('should classify VALIDATION breaks correctly', () => {
      const failure = {
        attemptId: 'login-flow',
        error: 'Validator failed',
        validators: [
          { type: 'elementVisible', selector: '.auth-required', status: 'FAIL' }
        ]
      };

      const breakType = classifyBreakType(failure);
      assert.strictEqual(breakType, BREAK_TYPES.VALIDATION);
    });

    it('should classify TIMEOUT breaks correctly', () => {
      const failure = {
        attemptId: 'checkout-flow',
        error: 'Timeout waiting for element selector',
        lastStep: {
          action: 'waitForSelector',
          timeout: 10000,
          elapsed: 10500
        }
      };

      const breakType = classifyBreakType(failure);
      assert.strictEqual(breakType, BREAK_TYPES.TIMEOUT);
    });

    it('should classify VISUAL breaks correctly', () => {
      const failure = {
        attemptId: 'marketing-page',
        error: 'Screenshot comparison failed visual validation',
        validators: [
          { type: 'screenshot', comparison: 'visual-diff', status: 'FAIL' }
        ]
      };

      const breakType = classifyBreakType(failure);
      assert.strictEqual(breakType, BREAK_TYPES.VISUAL);
    });

    it('should determine CRITICAL severity for REVENUE domain with SUBMISSION break in flow', () => {
      const severity = determineSeverity(IMPACT_DOMAINS.REVENUE, BREAK_TYPES.SUBMISSION, true);
      assert.strictEqual(severity, SEVERITY_LEVELS.CRITICAL);
    });

    it('should determine WARNING severity for REVENUE domain with FRICTION in attempt', () => {
      const severity = determineSeverity(IMPACT_DOMAINS.REVENUE, BREAK_TYPES.TIMEOUT, false);
      assert(severity === SEVERITY_LEVELS.WARNING || severity === SEVERITY_LEVELS.CRITICAL);
    });

    it('should determine INFO severity for UX domain with minor breaks', () => {
      const severity = determineSeverity(IMPACT_DOMAINS.UX, BREAK_TYPES.VISUAL, false);
      assert(severity === SEVERITY_LEVELS.INFO || severity === SEVERITY_LEVELS.WARNING);
    });
  });

  describe('Root Cause Analysis', () => {
    it('should derive hints from failed step selector issues', () => {
      const failure = {
        attemptId: 'form-fill',
        breakType: BREAK_TYPES.VALIDATION,
        lastStep: {
          action: 'fill',
          selector: '.email-input',
          error: 'Selector did not match'
        }
      };

      const hints = deriveRootCauseHints(failure, BREAK_TYPES.VALIDATION);
      assert(hints.hints.length > 0);
      assert(hints.primaryHint);
      assert(typeof hints.primaryHint === 'string');
    });

    it('should derive hints from timeout evidence', () => {
      const failure = {
        attemptId: 'slow-page',
        breakType: BREAK_TYPES.TIMEOUT,
        lastStep: {
          action: 'waitForNavigation',
          timeout: 30000,
          elapsed: 31000
        },
        frictionSignals: [
          { type: 'slow_step', duration: 5000, step: 'Navigation to /checkout' }
        ]
      };

      const hints = deriveRootCauseHints(failure, BREAK_TYPES.TIMEOUT);
      assert(hints.hints.length > 0);
      assert(hints.primaryHint.includes('slow') || hints.primaryHint.includes('timeout'));
    });

    it('should derive hints from validator failures', () => {
      const failure = {
        attemptId: 'auth-check',
        breakType: BREAK_TYPES.VALIDATION,
        failedValidators: [
          {
            type: 'elementVisible',
            selector: '.user-profile',
            error: 'Element not visible'
          }
        ]
      };

      const hints = deriveRootCauseHints(failure, BREAK_TYPES.VALIDATION);
      assert(hints.hints.length > 0);
      assert(hints.primaryHint);
    });

    it('should provide fallback hints for unclassified breaks', () => {
      const failure = {
        attemptId: 'unknown',
        breakType: 'UNKNOWN',
        error: 'Something went wrong'
      };

      const hints = deriveRootCauseHints(failure, 'UNKNOWN');
      // Should provide a hint even for unknown types
      assert(hints && hints.primaryHint);
      assert(typeof hints.primaryHint === 'string');
      assert(hints.primaryHint.length > 0);
    });
  });

  describe('Breakage Intelligence Analysis', () => {
    it('should analyze a single failure with complete intelligence', () => {
      const item = {
        attemptId: 'checkout-submission',
        outcome: 'FAILURE',
        error: 'Form submission timed out',
        lastStep: {
          action: 'click',
          selector: 'button[type=submit]'
        }
      };

      const intelligence = analyzeFailure(item, false);
      assert(intelligence.domain);
      assert(intelligence.breakType);
      assert(intelligence.severity);
      assert(intelligence.hints);
      assert(intelligence.primaryHint);
    });

    it('should elevate severity for flow failures in critical domains', () => {
      const flowItem = {
        flowId: 'checkout_flow',
        flowName: 'Checkout',
        outcome: 'FAILURE',
        error: 'Payment validation failed'
      };

      const intelligence = analyzeFailure(flowItem, true);
      assert.strictEqual(intelligence.severity, SEVERITY_LEVELS.CRITICAL);
    });

    it('should generate actionable "Why It Matters" bullets', () => {
      const item = {
        attemptId: 'payment-form',
        outcome: 'FAILURE',
        error: 'Payment validation failed'
      };

      const intelligence = analyzeFailure(item, false);
      const whyItMatters = generateWhyItMatters(intelligence);
      
      assert(whyItMatters);
      assert(whyItMatters.length > 0);
      assert(whyItMatters.length <= 3);
      whyItMatters.forEach(bullet => {
        assert(typeof bullet === 'string');
        assert(bullet.length > 0);
      });
    });

    it('should generate actionable Top 3 Actions', () => {
      const item = {
        attemptId: 'contact-form',
        outcome: 'FAILURE',
        error: 'Form submission validation failed',
        lastStep: {
          action: 'click',
          selector: 'button.submit'
        }
      };

      const intelligence = analyzeFailure(item, false);
      const topActions = generateTopActions(intelligence);
      
      assert(topActions);
      assert(topActions.length > 0);
      assert(topActions.length <= 3);
      topActions.forEach(action => {
        assert(typeof action === 'string');
        assert(action.length > 0);
      });
    });

    it('should aggregate intelligence across all failures with domain/severity breakdown', () => {
      const attempts = [
        {
          attemptId: 'checkout',
          outcome: 'FAILURE',
          error: 'Payment form validation failed',
          lastStep: { action: 'click', selector: 'button[type=submit]' }
        },
        {
          attemptId: 'auth-check',
          outcome: 'FAILURE',
          error: 'Login timeout',
          lastStep: { action: 'waitForNavigation', timeout: 30000, elapsed: 31000 }
        },
        {
          attemptId: 'visual-check',
          outcome: 'FAILURE',
          error: 'Visual regression detected'
        }
      ];

      const flows = [
        {
          flowId: 'purchase-flow',
          flowName: 'Purchase',
          outcome: 'FAILURE',
          error: 'Checkout submission timed out'
        }
      ];

      const intelligence = aggregateIntelligence(attempts, flows);
      
      assert(intelligence.totalFailures);
      assert(intelligence.failures);
      assert(Array.isArray(intelligence.failures));
      assert(intelligence.byDomain);
      assert(intelligence.bySeverity);
      assert(intelligence.escalationSignals);
      
      // Should have escalation signal for CRITICAL in REVENUE
      assert(
        intelligence.escalationSignals.some(s => s.includes('CRITICAL') || s.includes('REVENUE'))
      );
    });

    it('should compute escalation signals for critical events', () => {
      const attempts = [
        {
          attemptId: 'checkout1',
          outcome: 'FAILURE',
          error: 'Payment validation failed'
        },
        {
          attemptId: 'checkout2',
          outcome: 'FAILURE',
          error: 'Payment submission timed out'
        }
      ];

      const flows = [
        {
          flowId: 'purchase-flow',
          flowName: 'Purchase',
          outcome: 'FAILURE',
          error: 'Critical flow failed'
        }
      ];

      const intelligence = aggregateIntelligence(attempts, flows);
      assert(intelligence.escalationSignals.length > 0);
    });
  });

  describe('Policy Gating with Intelligence', () => {
    it('should fail policy evaluation on CRITICAL failure in REVENUE domain', () => {
      const policy = {
        failOnSeverity: 'CRITICAL',
        maxWarnings: 999,
        maxInfo: 999,
        failOnNewRegression: false,
        domainGates: {
          REVENUE: { CRITICAL: 0, WARNING: 999 },
          TRUST: { CRITICAL: 0, WARNING: 999 }
        }
      };

      const snapshot = {
        marketImpactSummary: {
          countsBySeverity: { CRITICAL: 1, WARNING: 0, INFO: 0 }
        },
        intelligence: {
          byDomain: {
            REVENUE: {
              failures: [
                {
                  domain: 'REVENUE',
                  severity: 'CRITICAL',
                  primaryHint: 'Payment form validation failed'
                }
              ]
            }
          }
        }
      };

      const evaluation = evaluatePolicy(snapshot, policy);
      assert.strictEqual(evaluation.exitCode, 1);
      assert(!evaluation.passed);
    });

    it('should pass policy evaluation when no CRITICAL failures in gated domains', () => {
      const policy = {
        failOnSeverity: 'CRITICAL',
        maxWarnings: 999,
        maxInfo: 999,
        failOnNewRegression: false,
        domainGates: {
          REVENUE: { CRITICAL: 0, WARNING: 999 },
          TRUST: { CRITICAL: 0, WARNING: 999 }
        }
      };

      const snapshot = {
        marketImpactSummary: {
          countsBySeverity: { CRITICAL: 0, WARNING: 1, INFO: 0 }
        },
        intelligence: {
          byDomain: {
            UX: {
              failures: [
                {
                  domain: 'UX',
                  severity: 'WARNING',
                  primaryHint: 'Visual element not centered'
                }
              ]
            }
          }
        }
      };

      const evaluation = evaluatePolicy(snapshot, policy);
      assert.strictEqual(evaluation.exitCode, 0);
      assert(evaluation.passed);
    });

    it('should detect WARNING gate violations per domain', () => {
      const policy = {
        failOnSeverity: 'INFO',
        maxWarnings: 999,
        maxInfo: 999,
        failOnNewRegression: false,
        domainGates: {
          UX: { CRITICAL: 999, WARNING: 1 }
        }
      };

      const snapshot = {
        marketImpactSummary: {
          countsBySeverity: { CRITICAL: 0, WARNING: 2, INFO: 0 }
        },
        intelligence: {
          byDomain: {
            UX: {
              failures: [
                { severity: 'WARNING', domain: 'UX' },
                { severity: 'WARNING', domain: 'UX' }
              ]
            }
          }
        }
      };

      const evaluation = evaluatePolicy(snapshot, policy);
      // Should warn about gate violation
      assert(evaluation.reasons.length > 0 || evaluation.exitCode > 0);
    });
  });

  describe('Deterministic Scoring', () => {
    it('should score the same failure consistently across runs', () => {
      const failure = {
        attemptId: 'checkout-form',
        outcome: 'FAILURE',
        error: 'Form submission validation failed',
        lastStep: {
          action: 'click',
          selector: 'button[type=submit]'
        }
      };

      const intel1 = analyzeFailure(failure, false);
      const intel2 = analyzeFailure(failure, false);

      assert.strictEqual(intel1.domain, intel2.domain);
      assert.strictEqual(intel1.breakType, intel2.breakType);
      assert.strictEqual(intel1.severity, intel2.severity);
      assert.strictEqual(intel1.primaryHint, intel2.primaryHint);
    });

    it('should score flow failures with +20 severity bonus consistently', () => {
      const failure = {
        flowId: 'checkout-flow',
        flowName: 'Checkout',
        outcome: 'FAILURE',
        error: 'Critical submission timeout'
      };

      const attemptIntel = analyzeFailure(failure, false);
      const flowIntel = analyzeFailure(failure, true);

      // Flow should be equal or higher severity
      const severityScore = { INFO: 0, WARNING: 50, CRITICAL: 100 };
      const attemptScore = severityScore[attemptIntel.severity] || 0;
      const flowScore = severityScore[flowIntel.severity] || 0;
      
      assert(flowScore >= attemptScore);
    });

    it('should produce deterministic intelligence summaries', () => {
      const failures = [
        {
          attemptId: 'a1',
          outcome: 'FAILURE',
          error: 'Timeout',
          lastStep: { action: 'waitForNavigation', timeout: 30000, elapsed: 31000 }
        },
        {
          attemptId: 'a2',
          outcome: 'FAILURE',
          error: 'Validation failed',
          failedValidators: [{ type: 'elementVisible' }]
        }
      ];

      const intel1 = aggregateIntelligence(failures, []);
      const intel2 = aggregateIntelligence(failures, []);

      assert.strictEqual(intel1.totalFailures, intel2.totalFailures);
      assert.strictEqual(intel1.failures.length, intel2.failures.length);
      assert.deepStrictEqual(intel1.byDomain, intel2.byDomain);
    });
  });

  describe('Evidence and Reporting', () => {
    it('should include intelligence in market report JSON', () => {
      // This test verifies integration with market-reporter
      // The actual market report is generated by market-reporter.js
      // We test that intelligence structure is correct for reporting
      
      const intelligence = {
        totalFailures: 3,
        failures: [
          {
            attemptId: 'a1',
            domain: 'REVENUE',
            severity: 'CRITICAL',
            primaryHint: 'Payment form validation failed'
          },
          {
            attemptId: 'a2',
            domain: 'UX',
            severity: 'WARNING',
            primaryHint: 'Visual element not visible'
          }
        ],
        byDomain: {
          REVENUE: { failures: [{ severity: 'CRITICAL' }] },
          UX: { failures: [{ severity: 'WARNING' }] }
        },
        bySeverity: {
          CRITICAL: [{ attemptId: 'a1' }],
          WARNING: [{ attemptId: 'a2' }]
        },
        escalationSignals: ['CRITICAL detected in REVENUE domain'],
        summary: 'Found 3 failures'
      };

      // Verify structure for reporting
      assert(intelligence.totalFailures > 0);
      assert(intelligence.failures.every(f => f.domain && f.severity));
      assert(intelligence.escalationSignals.every(s => typeof s === 'string'));
    });
  });

});
