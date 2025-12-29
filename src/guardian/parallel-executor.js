/**
 * Phase 7.2 - Parallel Executor
 * Controlled parallel execution of attempts with bounded concurrency
 */

/**
 * Execute attempts with bounded parallelism
 * @param {Array} attempts - Array of attempts to execute
 * @param {Function} executeAttemptFn - Async function(attempt) => result
 * @param {number} maxConcurrency - Max concurrent attempts (must be >= 1)
 * @param {Object} options - { shouldStop?: Function }
 * @returns {Promise<Array>} Results in original input order
 */
async function executeParallel(attempts, executeAttemptFn, maxConcurrency = 1, options = {}) {
  if (maxConcurrency < 1) {
    throw new Error('maxConcurrency must be >= 1');
  }

  // Handle empty queue immediately
  if (!attempts || attempts.length === 0) {
    return [];
  }

  const results = new Array(attempts.length);
  const queue = attempts.map((attempt, index) => ({ attempt, index }));
  let executing = 0;
  let queueIndex = 0;
  let shouldStop = false;

  return new Promise((resolve, reject) => {
    const processNext = async () => {
      // Check if we should stop (e.g., fail-fast triggered)
      if (options.shouldStop && options.shouldStop()) {
        shouldStop = true;
      }

      // If no more work and nothing executing, we're done
      if (queueIndex >= queue.length && executing === 0) {
        resolve(results);
        return;
      }

      // If we've hit the concurrency limit or have no more items, wait
      if (executing >= maxConcurrency || queueIndex >= queue.length) {
        return;
      }

      // Get next item from queue
      const { attempt, index } = queue[queueIndex];
      queueIndex++;
      executing++;

      try {
        // Only execute if we haven't stopped
        if (!shouldStop) {
          results[index] = await executeAttemptFn(attempt);
        } else {
          // Mark as skipped if we stopped
          results[index] = { skipped: true, attemptId: attempt };
        }
      } catch (err) {
        results[index] = { error: err, skipped: false, attemptId: attempt };
      } finally {
        executing--;
        // Process next item(s)
        processNext();
        if (executing < maxConcurrency && queueIndex < queue.length && !shouldStop) {
          processNext();
        }
      }
    };

    // Start workers
    for (let i = 0; i < Math.min(maxConcurrency, queue.length); i++) {
      processNext();
    }
  });
}

/**
 * Validate parallel concurrency value
 * @param {number|string} value - Value to validate
 * @returns {{ valid: boolean, parallel?: number, error?: string, hint?: string }}
 */
function validateParallel(value) {
  if (value === undefined || value === null) {
    return { valid: true, parallel: 1 };
  }

  const num = parseInt(value, 10);

  // Check for NaN
  if (isNaN(num)) {
    return {
      valid: false,
      error: `Invalid --parallel value: '${value}' (expected integer >= 1)`,
      hint: 'Example: --parallel 2'
    };
  }

  // Check if less than 1
  if (num < 1) {
    return {
      valid: false,
      error: `Invalid --parallel value: ${num} (must be >= 1)`,
      hint: 'Example: --parallel 2'
    };
  }

  return { valid: true, parallel: num };
}

module.exports = {
  executeParallel,
  validateParallel
};
