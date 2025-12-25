/**
 * Guardian Timeout Profiles
 * Defines deterministic timeout values for different performance modes
 */

const TIMEOUT_PROFILES = {
  fast: {
    // Fast mode: aggressive timeouts for quick feedback
    pageLoad: 8000,        // page navigation
    elementWait: 3000,     // finding elements
    actionWait: 2000,      // click/type settlement (used by wait-for-outcome)
    submitSettle: 2500,    // form submission settlement
    networkWait: 1500,     // network response wait
    default: 8000
  },
  default: {
    // Default mode: current behavior (balanced)
    pageLoad: 20000,
    elementWait: 5000,
    actionWait: 3500,      // matches DEFAULT_MAX_WAIT in wait-for-outcome
    submitSettle: 4000,
    networkWait: 3500,
    default: 20000
  },
  slow: {
    // Slow mode: patient timeouts for flaky networks
    pageLoad: 30000,
    elementWait: 10000,
    actionWait: 5000,
    submitSettle: 6000,
    networkWait: 5000,
    default: 30000
  }
};

function getTimeoutProfile(profileName = 'default') {
  const profile = TIMEOUT_PROFILES[profileName];
  if (!profile) {
    throw new Error(`Invalid timeout profile: ${profileName}. Valid values: ${Object.keys(TIMEOUT_PROFILES).join(', ')}`);
  }
  return profile;
}

function resolveTimeout(configValue, profile) {
  // If config explicitly sets a timeout, use it (allows override)
  if (configValue && typeof configValue === 'number') {
    return configValue;
  }
  // Otherwise use profile default
  return profile.default;
}

module.exports = {
  TIMEOUT_PROFILES,
  getTimeoutProfile,
  resolveTimeout
};
