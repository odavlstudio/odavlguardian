/**
 * ODAVL Guardian Plan Manager
 * Manages user plans, checks limits, and enforces restrictions
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getPlan, planAllows, isWithinLimit, getLimitExceededMessage } = require('./plan-definitions');
const { getUsageStats, canPerformScan, canAddSite, recordScan } = require('./usage-tracker');

const PLAN_DIR = path.join(os.homedir(), '.odavl-guardian', 'plan');
const PLAN_FILE = path.join(PLAN_DIR, 'current-plan.json');

/**
 * Ensure plan directory exists
 */
function ensurePlanDir() {
  if (!fs.existsSync(PLAN_DIR)) {
    fs.mkdirSync(PLAN_DIR, { recursive: true });
  }
}

/**
 * Get current plan
 */
function getCurrentPlan() {
  ensurePlanDir();
  
  if (!fs.existsSync(PLAN_FILE)) {
    // Default to FREE plan
    return {
      planId: 'free',
      activated: new Date().toISOString(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }
  
  try {
    return JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error loading plan:', error.message);
    return {
      planId: 'free',
      activated: new Date().toISOString(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }
}

/**
 * Set current plan
 */
function setCurrentPlan(planId, stripeData = {}) {
  ensurePlanDir();
  
  const planInfo = {
    planId: planId.toLowerCase(),
    activated: new Date().toISOString(),
    stripeCustomerId: stripeData.customerId || null,
    stripeSubscriptionId: stripeData.subscriptionId || null,
    upgraded: new Date().toISOString(),
  };
  
  fs.writeFileSync(PLAN_FILE, JSON.stringify(planInfo, null, 2), 'utf-8');
  return planInfo;
}

/**
 * Check if a feature is allowed
 */
function checkFeatureAllowed(feature) {
  const currentPlan = getCurrentPlan();
  const plan = getPlan(currentPlan.planId);
  const allowed = planAllows(currentPlan.planId, feature);
  
  return {
    allowed,
    plan: plan.name,
    message: allowed ? null : getLimitExceededMessage(currentPlan.planId, feature),
  };
}

/**
 * Check if can perform scan
 */
function checkCanScan(url) {
  const currentPlan = getCurrentPlan();
  const plan = getPlan(currentPlan.planId);
  const usage = getUsageStats();
  
  // Check site limit first
  if (!canAddSite(url, plan.maxSites)) {
    return {
      allowed: false,
      reason: 'site_limit',
      message: getLimitExceededMessage(currentPlan.planId, 'sites'),
      plan: plan.name,
      usage: {
        sites: usage.sites.length,
        maxSites: plan.maxSites,
      },
    };
  }
  
  // Check scan limit
  if (!canPerformScan(plan.maxScansPerMonth)) {
    return {
      allowed: false,
      reason: 'scan_limit',
      message: getLimitExceededMessage(currentPlan.planId, 'scans'),
      plan: plan.name,
      usage: {
        scansThisMonth: usage.scansThisMonth,
        maxScans: plan.maxScansPerMonth,
      },
    };
  }
  
  return {
    allowed: true,
    plan: plan.name,
    usage: {
      scansThisMonth: usage.scansThisMonth,
      maxScans: plan.maxScansPerMonth,
      scansRemaining: plan.maxScansPerMonth === -1 ? 'Unlimited' : plan.maxScansPerMonth - usage.scansThisMonth,
    },
  };
}

/**
 * Record scan and enforce limits
 */
function performScan(url) {
  const check = checkCanScan(url);
  
  if (!check.allowed) {
    throw new Error(check.message);
  }
  
  // Record the scan
  recordScan(url);
  
  return {
    success: true,
    plan: check.plan,
    usage: getUsageStats(),
  };
}

/**
 * Get plan summary for display
 */
function getPlanSummary() {
  const currentPlan = getCurrentPlan();
  const plan = getPlan(currentPlan.planId);
  const usage = getUsageStats();
  
  return {
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
    },
    limits: {
      scans: {
        max: plan.maxScansPerMonth,
        used: usage.scansThisMonth,
        remaining: plan.maxScansPerMonth === -1 ? 'Unlimited' : Math.max(0, plan.maxScansPerMonth - usage.scansThisMonth),
      },
      sites: {
        max: plan.maxSites,
        used: usage.sites.length,
        remaining: plan.maxSites === -1 ? 'Unlimited' : Math.max(0, plan.maxSites - usage.sites.length),
      },
    },
    features: {
      liveGuardian: plan.liveGuardianAllowed,
      ciMode: plan.ciModeAllowed,
      alerts: plan.alertsAllowed,
    },
    activated: currentPlan.activated,
  };
}

/**
 * Upgrade message helper
 */
function getUpgradeMessage() {
  return '\nTo upgrade your plan, visit: https://guardian.odavl.com/pricing\nOr run: guardian upgrade';
}

/**
 * Get plan file path (for debugging)
 */
function getPlanFilePath() {
  return PLAN_FILE;
}

module.exports = {
  getCurrentPlan,
  setCurrentPlan,
  checkFeatureAllowed,
  checkCanScan,
  performScan,
  getPlanSummary,
  getUpgradeMessage,
  getPlanFilePath,
};
