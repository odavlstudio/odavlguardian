/**
 * Guardian Webhook Notifications
 * 
 * Send CI-friendly notifications on test completion.
 * - Failure-tolerant (doesn't crash if webhook fails)
 * - JSON payload with summary and artifact paths
 * - Support for multiple webhook URLs
 * 
 * NO AI. Pure deterministic notification delivery.
 */

/**
 * @typedef {Object} WebhookPayload
 * @property {Object} meta - Metadata (url, runId, createdAt, environment)
 * @property {Object} summary - Risk summary (exitCode, counts, topRisks)
 * @property {Object} artifactPaths - Paths to generated artifacts
 */

/**
 * Build webhook payload from snapshot and evaluation
 */
function buildWebhookPayload(snapshot, policyEvaluation = null, artifacts = {}) {
  const meta = snapshot.meta || {};
  const marketImpact = snapshot.marketImpactSummary || {};
  const discovery = snapshot.discovery || {};

  // Build summary
  const summary = {
    exitCode: policyEvaluation?.exitCode || 0,
    passed: policyEvaluation?.passed !== false,
    riskCounts: {
      critical: marketImpact.countsBySeverity?.CRITICAL || 0,
      warning: marketImpact.countsBySeverity?.WARNING || 0,
      info: marketImpact.countsBySeverity?.INFO || 0,
      total: marketImpact.totalRiskCount || 0
    },
    topRisks: (marketImpact.topRisks || [])
      .slice(0, 3)
      .map(risk => ({
        category: risk.category,
        severity: risk.severity,
        score: risk.impactScore,
        reason: risk.humanReadableReason
      })),
    discoveryStats: {
      pagesVisited: discovery.pagesVisitedCount || 0,
      interactionsDiscovered: discovery.interactionsDiscovered || 0,
      interactionsExecuted: discovery.interactionsExecuted || 0
    },
    policyReasons: policyEvaluation?.reasons || []
  };

  // Build artifact paths
  const artifactPaths = {
    snapshotJson: artifacts.snapshotJson || null,
    htmlReport: artifacts.htmlReport || null,
    junitXml: artifacts.junitXml || null,
    screenshotsDir: artifacts.screenshotsDir || null,
    networkTrace: artifacts.networkTrace || null
  };

  return {
    meta: {
      url: meta.url,
      runId: meta.runId,
      createdAt: meta.createdAt,
      environment: meta.environment || 'production',
      toolVersion: meta.toolVersion
    },
    summary,
    artifactPaths
  };
}

/**
 * Send webhook notification
 * Returns { success: boolean, statusCode?: number, error?: string }
 */
async function sendWebhook(webhookUrl, payload) {
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL provided' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ODAVL-Guardian/0.4.0'
      },
      body: JSON.stringify(payload),
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return {
      success: true,
      statusCode: response.status
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Send webhook with failure tolerance
 * Logs warning if webhook fails, but doesn't throw
 */
async function sendWebhookSafe(webhookUrl, payload, logger = console) {
  if (!webhookUrl) {
    return { sent: false, reason: 'No webhook URL' };
  }

  const result = await sendWebhook(webhookUrl, payload);

  if (!result.success) {
    logger.warn(`⚠️  Webhook notification failed: ${result.error}`);
    return { sent: false, reason: result.error };
  }

  logger.log(`✅ Webhook notification sent (HTTP ${result.statusCode})`);
  return { sent: true };
}

/**
 * Send to multiple webhooks
 */
async function sendWebhooks(webhookUrls, payload, logger = console) {
  if (!webhookUrls || webhookUrls.length === 0) {
    return [];
  }

  const results = [];

  for (const url of webhookUrls) {
    const result = await sendWebhookSafe(url, payload, logger);
    results.push({ url, ...result });
  }

  return results;
}

/**
 * Format webhook payload for logging
 */
function formatWebhookPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse webhook URL from environment or option
 */
function getWebhookUrl(envVar = 'GUARDIAN_WEBHOOK_URL', optionValue = null) {
  if (optionValue) {
    return optionValue;
  }

  return process.env[envVar] || null;
}

/**
 * Parse webhook URLs (comma-separated or JSON array)
 */
function parseWebhookUrls(urlString) {
  if (!urlString) {
    return [];
  }

  // Try to parse as JSON array first
  if (urlString.startsWith('[')) {
    try {
      const parsed = JSON.parse(urlString);
      if (Array.isArray(parsed)) {
        return parsed.filter(u => typeof u === 'string' && u.trim());
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }

  // Parse as comma-separated values
  return urlString
    .split(',')
    .map(u => u.trim())
    .filter(u => u);
}

module.exports = {
  buildWebhookPayload,
  sendWebhook,
  sendWebhookSafe,
  sendWebhooks,
  formatWebhookPayload,
  getWebhookUrl,
  parseWebhookUrls
};
