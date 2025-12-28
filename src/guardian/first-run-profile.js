/**
 * First-Run State Tracking
 * 
 * Detects if this is the user's first invocation of Guardian
 * Applies conservative "golden path" profile on first run
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const FIRST_RUN_STATE_DIR = path.join(os.homedir(), '.odavl-guardian');
const FIRST_RUN_MARKER = path.join(FIRST_RUN_STATE_DIR, 'first-run-complete.json');

/**
 * Check if this is the user's first run
 */
function isFirstRun() {
  return !fs.existsSync(FIRST_RUN_MARKER);
}

/**
 * Mark first run as complete
 */
function markFirstRunComplete() {
  try {
    if (!fs.existsSync(FIRST_RUN_STATE_DIR)) {
      fs.mkdirSync(FIRST_RUN_STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(FIRST_RUN_MARKER, JSON.stringify({
      completedAt: new Date().toISOString(),
      version: require('../../package.json').version
    }), 'utf8');
  } catch (e) {
    // Silent fail if we can't write state
  }
}

/**
 * Get first-run execution profile
 * Conservative settings for initial scan
 */
function getFirstRunProfile() {
  return {
    // Timeouts: more generous for first run
    timeout: 25000, // 25s (vs default 20s)
    // Disable resource-intensive options
    parallel: 1, // Single-threaded
    failFast: false,
    fast: false, // Don't skip for speed
    // Minimal discovery
    enableDiscovery: false,
    enableCrawl: true, // Light crawl only
    maxPages: 10, // Fewer pages
    maxDepth: 2, // Shallower
    // Evidence capture
    enableScreenshots: true,
    enableTrace: false, // Traces can slow things down
    headful: false, // Headless is faster
    // Safety
    includeUniversal: false,
    // CI mode off for first run (more readable output)
    ciMode: false
  };
}

/**
 * Apply first-run profile to config
 * Merges conservative defaults without overwriting user intent on --url
 */
function applyFirstRunProfile(userConfig) {
  if (!isFirstRun()) {
    return userConfig; // Not first run; use as-is
  }

  const profile = getFirstRunProfile();
  return {
    ...profile,
    ...userConfig, // User overrides profile
    baseUrl: userConfig.baseUrl // Preserve required --url
  };
}

module.exports = {
  isFirstRun,
  markFirstRunComplete,
  getFirstRunProfile,
  applyFirstRunProfile
};
