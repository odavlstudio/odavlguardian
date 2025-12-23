/**
 * Market Reality Snapshot v1 Schema Definition
 * 
 * A snapshot captures a complete market reality test run:
 * - what was discovered (crawl)
 * - what was attempted (attempts)
 * - what was observed (evidence: screenshots, traces, reports)
 * - what signals were detected (friction, failures, regressions)
 * - what the baseline was and how current differs
 */

const SNAPSHOT_SCHEMA_VERSION = 'v1';

/**
 * @typedef {Object} SnapshotMeta
 * @property {string} schemaVersion - always 'v1'
 * @property {string} createdAt - ISO timestamp
 * @property {string} toolVersion - package.json version
 * @property {string} url - base URL tested
 * @property {string} runId - unique run identifier
 * @property {string} [environment] - optional deployment environment
 */

/**
 * @typedef {Object} CrawlResult
 * @property {string[]} discoveredUrls - all unique URLs found
 * @property {number} visitedCount - pages successfully loaded
 * @property {number} failedCount - pages that failed to load
 * @property {number} safetyBlockedCount - pages blocked by safety rules
 * @property {Array<{url: string, statusCode: number, error: string}>} [httpFailures] - detailed failures
 * @property {string} [notes] - human-readable summary
 */

/**
 * @typedef {Object} ValidatorResult
 * @property {string} id - unique validator ID
 * @property {string} type - validator type (urlIncludes, elementVisible, etc)
 * @property {string} status - 'PASS', 'FAIL', or 'WARN'
 * @property {string} message - human readable result
 * @property {Object} [evidence] - supporting data (selector, url, snippet, etc)
 */

/**
 * @typedef {Object} AttemptResult
 * @property {string} attemptId - unique attempt identifier
 * @property {string} attemptName - human-readable name
 * @property {string} goal - what the user tried to achieve
 * @property {string} outcome - 'SUCCESS', 'FAILURE', or 'FRICTION'
 * @property {number} totalDurationMs - elapsed time
 * @property {number} stepCount - how many steps executed
 * @property {number} failedStepIndex - index of first failed step, or -1 if all succeeded
 * @property {Object} friction - friction signals for this attempt
 * @property {ValidatorResult[]} [validators] - soft failure detectors (Phase 2)
 * @property {number} [softFailureCount] - count of failed validators
 * @property {string} [riskCategory] - 'LEAD', 'REVENUE', 'TRUST/UX' (Phase 2)
 */

/**
 * @typedef {Object} Evidence
 * @property {string} artifactDir - root directory where all artifacts were saved
 * @property {string} [marketReportJson] - path to market-report.json
 * @property {string} [marketReportHtml] - path to market-report.html
 * @property {string} [traceZip] - path to trace.zip if enabled
 * @property {Object<string, string>} [attemptArtifacts] - { attemptId => { reportJson, reportHtml, screenshotDir } }
 */

/**
 * @typedef {Object} Signal
 * @property {string} id - unique signal ID
 * @property {string} severity - 'low', 'medium', 'high', 'critical'
 * @property {string} type - 'friction', 'failure', 'regression', 'timeout', 'missing_element', 'soft_failure'
 * @property {string} description - human readable
 * @property {string} [affectedAttemptId] - if specific to an attempt
 */

/**
 * @typedef {Object} BaselineInfo
 * @property {boolean} baselineFound - whether a baseline was loaded
 * @property {boolean} baselineCreatedThisRun - true if baseline was auto-created in this run
 * @property {string} [baselineCreatedAt] - ISO timestamp when baseline was first created
 * @property {string} [baselinePath] - file system path to baseline
 * @property {Object} [diff] - comparison result if baseline exists
 * @property {Object} [diff.regressions] - { attemptId => {before, after, reason} }
 * @property {Object} [diff.improvements] - { attemptId => {before, after, reason} }
 * @property {number} [diff.attemptsDriftCount] - how many attempts changed outcome
 * @property {Array} [diff.validatorsChanged] - validator regression details (Phase 2)
 */

/**
 * @typedef {Object} MarketRisk
 * @property {string} attemptId - which attempt
 * @property {string} validatorId - which validator or friction signal
 * @property {string} category - REVENUE|LEAD|TRUST|UX
 * @property {string} severity - CRITICAL|WARNING|INFO
 * @property {number} impactScore - 0-100 deterministic score
 * @property {string} humanReadableReason - explanation
 */

/**
 * @typedef {Object} MarketImpactSummary
 * @property {string} highestSeverity - CRITICAL|WARNING|INFO
 * @property {number} totalRiskCount - total number of identified risks
 * @property {Object} countsBySeverity - { CRITICAL: N, WARNING: N, INFO: N }
 * @property {MarketRisk[]} topRisks - top 10 risks, sorted by impact score
 */

/**
 * @typedef {Object} InteractionResult
 * @property {string} interactionId - unique ID
 * @property {string} pageUrl - URL where found
 * @property {string} type - NAVIGATE|CLICK|FORM_FILL
 * @property {string} selector - CSS selector to find element
 * @property {string} outcome - SUCCESS|FAILURE|FRICTION
 * @property {string} [notes] - details (target URL, error, etc)
 * @property {number} [durationMs] - execution time
 * @property {string} [errorMessage] - if FAILURE
 * @property {string} [evidencePath] - path to screenshot
 */

/**
 * @typedef {Object} DiscoverySummary
 * @property {string[]} pagesVisited - URLs crawled
 * @property {number} pagesVisitedCount - total pages
 * @property {number} interactionsDiscovered - total candidates found
 * @property {number} interactionsExecuted - candidates executed
 * @property {Object} interactionsByType - { NAVIGATE: N, CLICK: N, FORM_FILL: N }
 * @property {Object} interactionsByRisk - { safe: N, risky: N }
 * @property {InteractionResult[]} results - execution results (failures + top successes)
 * @property {string} [summary] - human readable summary
 */

/**
 * @typedef {Object} MarketRealitySnapshot
 * @property {string} schemaVersion - always 'v1'
 * @property {SnapshotMeta} meta
 * @property {CrawlResult} [crawl]
 * @property {AttemptResult[]} attempts
 * @property {Array} flows
 * @property {Signal[]} signals
 * @property {Object} [riskSummary] - market risk analysis (Phase 2)
 * @property {MarketImpactSummary} [marketImpactSummary] - market criticality (Phase 3)
 * @property {DiscoverySummary} [discovery] - auto-discovered interactions (Phase 4)
 * @property {Evidence} evidence
 * @property {BaselineInfo} baseline
 */

function createEmptySnapshot(baseUrl, runId, toolVersion) {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    meta: {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      toolVersion,
      url: baseUrl,
      runId,
      environment: process.env.GUARDIAN_ENV || 'production'
    },
    crawl: {
      discoveredUrls: [],
      visitedCount: 0,
      failedCount: 0,
      safetyBlockedCount: 0,
      httpFailures: [],
      notes: ''
    },
    attempts: [],
    flows: [],
    signals: [],
    riskSummary: {
      totalSoftFailures: 0,
      totalFriction: 0,
      failuresByCategory: {},
      topRisks: []
    },
    marketImpactSummary: {
      highestSeverity: 'INFO',
      totalRiskCount: 0,
      countsBySeverity: {
        CRITICAL: 0,
        WARNING: 0,
        INFO: 0
      },
      topRisks: []
    },
    discovery: {
      pagesVisited: [],
      pagesVisitedCount: 0,
      interactionsDiscovered: 0,
      interactionsExecuted: 0,
      interactionsByType: {
        NAVIGATE: 0,
        CLICK: 0,
        FORM_FILL: 0
      },
      interactionsByRisk: {
        safe: 0,
        risky: 0
      },
      results: [],
      summary: ''
    },
    evidence: {
      artifactDir: '',
      attemptArtifacts: {},
      flowArtifacts: {}
    },
    intelligence: {
      totalFailures: 0,
      failures: [],
      byDomain: {},
      bySeverity: {},
      escalationSignals: [],
      summary: ''
    },
    baseline: {
      baselineFound: false,
      baselineCreatedThisRun: false,
      baselineCreatedAt: null,
      baselinePath: null,
      diff: null
    }
  };
}

function validateSnapshot(snapshot) {
  const errors = [];

  if (!snapshot.schemaVersion || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    errors.push('Missing or invalid schemaVersion');
  }

  if (!snapshot.meta || !snapshot.meta.createdAt || !snapshot.meta.url || !snapshot.meta.runId) {
    errors.push('Missing required meta fields: createdAt, url, runId');
  }

  if (!Array.isArray(snapshot.attempts)) {
    errors.push('attempts must be an array');
  }

  if (!Array.isArray(snapshot.signals)) {
    errors.push('signals must be an array');
  }

  if (!Array.isArray(snapshot.flows)) {
    errors.push('flows must be an array');
  }

  if (!snapshot.evidence || !snapshot.evidence.artifactDir) {
    errors.push('Missing evidence.artifactDir');
  }

  if (!snapshot.baseline) {
    errors.push('Missing baseline section');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  SNAPSHOT_SCHEMA_VERSION,
  createEmptySnapshot,
  validateSnapshot
};
