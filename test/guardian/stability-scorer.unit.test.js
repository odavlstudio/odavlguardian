const {
  classifyErrorType,
  scoreStepStability,
  computeRunStabilityScore,
  buildStabilityReport,
  assessStability
} = require('../../src/guardian/stability-scorer');

describe('stability-scorer', () => {
  describe('classifyErrorType', () => {
    test('classifies timeout as transient', () => {
      const result = classifyErrorType('Navigation timeout after 5000ms');
      expect(result.isTransient).toBe(true);
      expect(result.classification).toBe('TIMEOUT');
    });

    test('classifies navigation timeout as transient', () => {
      const result = classifyErrorType('Navigation timed out waiting for load');
      expect(result.isTransient).toBe(true);
      // Will match 'timeout' first, so TIMEOUT classification
      expect(['TIMEOUT', 'NAVIGATION_TIMEOUT']).toContain(result.classification);
    });

    test('classifies detached frame as transient', () => {
      const result = classifyErrorType('Detached frame error');
      expect(result.isTransient).toBe(true);
      expect(result.classification).toBe('DETACHED_FRAME');
    });

    test('classifies network error as transient', () => {
      const result = classifyErrorType('ECONNREFUSED: Connection refused');
      expect(result.isTransient).toBe(true);
      expect(result.classification).toBe('NETWORK_ERROR');
    });

    test('classifies element not found as deterministic', () => {
      const result = classifyErrorType('Element not found: .cta-button');
      expect(result.isTransient).toBe(false);
      expect(result.classification).toBe('ELEMENT_NOT_FOUND');
    });

    test('classifies element not visible as deterministic', () => {
      const result = classifyErrorType('Element not visible: button.hidden');
      expect(result.isTransient).toBe(false);
      expect(result.classification).toBe('ELEMENT_NOT_VISIBLE');
    });

    test('classifies CTA not found as deterministic', () => {
      const result = classifyErrorType('No CTA found matching heuristics');
      expect(result.isTransient).toBe(false);
      expect(result.classification).toBe('CTA_NOT_FOUND');
    });

    test('defaults unknown errors to transient', () => {
      const result = classifyErrorType('Some weird error');
      expect(result.isTransient).toBe(true);
      expect(result.classification).toBe('UNKNOWN');
    });
  });

  describe('scoreStepStability', () => {
    test('scores successful step on first attempt as excellent', () => {
      const step = {
        id: 'step1',
        success: true,
        attemptNumber: 1
      };

      const score = scoreStepStability(step);

      expect(score.stepId).toBe('step1');
      expect(score.finalStatus).toBe('SUCCESS');
      expect(score.stable).toBe(true);
      expect(score.confidence).toBe(100);
      expect(score.attempts).toBe(1);
    });

    test('scores successful step after retries as stable but lower confidence', () => {
      const step = {
        id: 'step1',
        success: true,
        attemptNumber: 3,
        error: 'Navigation timeout'
      };

      const score = scoreStepStability(step);

      expect(score.finalStatus).toBe('SUCCESS');
      expect(score.stable).toBe(true);
      expect(score.confidence).toBeLessThan(100);
      expect(score.confidence).toBeGreaterThan(50);
      expect(score.isTransient).toBe(true);
    });

    test('scores failed step with very low confidence', () => {
      const step = {
        id: 'step1',
        success: false,
        attemptNumber: 3,
        error: 'Element not found: .cta'
      };

      const score = scoreStepStability(step);

      expect(score.finalStatus).toBe('FAILED');
      expect(score.stable).toBe(false);
      expect(score.confidence).toBe(10);
      expect(score.isTransient).toBe(false);
    });
  });

  describe('computeRunStabilityScore', () => {
    test('returns 100 for all steps succeeding on first attempt', () => {
      const result = {
        executedSteps: [
          { id: 'step1', success: true, attemptNumber: 1 },
          { id: 'step2', success: true, attemptNumber: 1 },
          { id: 'step3', success: true, attemptNumber: 1 }
        ]
      };

      const score = computeRunStabilityScore(result);

      expect(score).toBe(100);
    });

    test('deducts 10 points per step with retries', () => {
      const result = {
        executedSteps: [
          { id: 'step1', success: true, attemptNumber: 2 },
          { id: 'step2', success: true, attemptNumber: 1 }
        ]
      };

      const score = computeRunStabilityScore(result);

      expect(score).toBe(90); // 100 - (1 step × 10)
    });

    test('deducts 30 points per failed step', () => {
      const result = {
        executedSteps: [
          { id: 'step1', success: true, attemptNumber: 1 },
          { id: 'step2', success: false, attemptNumber: 3, error: 'Element not found' }
        ]
      };

      const score = computeRunStabilityScore(result);

      // 100 - (1 failed × 30) = 70, but failed step has 3 attempts
      // So: 100 - (1 step with retries × 10) - (1 failed × 30) = 60
      expect(score).toBe(60);
    });

    test('combines deductions correctly', () => {
      const result = {
        executedSteps: [
          { id: 'step1', success: true, attemptNumber: 2 }, // -10
          { id: 'step2', success: false, attemptNumber: 3, error: 'Timeout' }, // -10 + -30
          { id: 'step3', success: true, attemptNumber: 1 }
        ]
      };

      const score = computeRunStabilityScore(result);

      // 100 - 10 (step1 retries) - 10 (step2 retries) - 30 (step2 failed) = 50
      expect(score).toBe(50);
    });

    test('floors score at 0', () => {
      const result = {
        executedSteps: [
          { id: 'step1', success: false, attemptNumber: 3, error: 'Error' },
          { id: 'step2', success: false, attemptNumber: 3, error: 'Error' },
          { id: 'step3', success: false, attemptNumber: 3, error: 'Error' },
          { id: 'step4', success: false, attemptNumber: 3, error: 'Error' }
        ]
      };

      const score = computeRunStabilityScore(result);

      expect(score).toBe(0); // Bottoms out at 0
    });

    test('returns 0 for empty result', () => {
      const result = { executedSteps: [] };

      const score = computeRunStabilityScore(result);

      expect(score).toBe(0);
    });
  });

  describe('buildStabilityReport', () => {
    test('generates complete report with all fields', () => {
      const result = {
        executedSteps: [
          { id: 'step1', success: true, attemptNumber: 1 },
          { id: 'step2', success: true, attemptNumber: 2, error: 'Timeout' }
        ]
      };

      const report = buildStabilityReport(result);

      expect(report).toHaveProperty('runStabilityScore');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('stepStability');
      expect(report).toHaveProperty('assessment');

      expect(report.metrics.totalSteps).toBe(2);
      expect(report.metrics.succeededSteps).toBe(2);
      expect(report.metrics.failedSteps).toBe(0);
      expect(report.metrics.stepsWithRetries).toBe(1);
      expect(report.metrics.totalAttempts).toBe(3);
    });
  });

  describe('assessStability', () => {
    test('assesses 80+ as excellent', () => {
      expect(assessStability(100)).toBe('excellent');
      expect(assessStability(80)).toBe('excellent');
    });

    test('assesses 60-79 as good', () => {
      expect(assessStability(79)).toBe('good');
      expect(assessStability(60)).toBe('good');
    });

    test('assesses 40-59 as fair', () => {
      expect(assessStability(59)).toBe('fair');
      expect(assessStability(40)).toBe('fair');
    });

    test('assesses <40 as poor', () => {
      expect(assessStability(39)).toBe('poor');
      expect(assessStability(0)).toBe('poor');
    });
  });
});
