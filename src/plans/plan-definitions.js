/**
 * ODAVL Guardian Plan Definitions
 * Real enforced limits for FREE, PRO, and BUSINESS plans
 */

const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceMonthly: 0,
    maxScansPerMonth: 10,
    maxSites: 1,
    liveGuardianAllowed: false,
    ciModeAllowed: false,
    alertsAllowed: false,
    features: [
      'Scan public pages',
      'Basic issue detection',
      'CLI usage',
      'Community support',
    ],
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceMonthly: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    maxScansPerMonth: 200,
    maxSites: 3,
    liveGuardianAllowed: true,
    ciModeAllowed: true,
    alertsAllowed: true,
    features: [
      'Deeper checks & signals',
      'Prioritized findings',
      'Live guardian monitoring',
      'CI/CD integration',
      'Email alerts',
      'Exportable reports',
    ],
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: 99,
    priceMonthly: 99,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_placeholder',
    maxScansPerMonth: -1, // unlimited
    maxSites: -1, // unlimited
    liveGuardianAllowed: true,
    ciModeAllowed: true,
    alertsAllowed: true,
    features: [
      'Everything in Pro',
      'Unlimited scans',
      'Unlimited sites',
      'Priority support',
      'Custom integrations',
      'Team collaboration',
    ],
  },
};

/**
 * Get plan by ID
 */
function getPlan(planId) {
  const normalizedId = planId.toUpperCase();
  if (!PLANS[normalizedId]) {
    return PLANS.FREE;
  }
  return PLANS[normalizedId];
}

/**
 * Check if a plan allows a specific feature
 */
function planAllows(planId, feature) {
  const plan = getPlan(planId);
  switch (feature) {
    case 'liveGuardian':
      return plan.liveGuardianAllowed;
    case 'ciMode':
      return plan.ciModeAllowed;
    case 'alerts':
      return plan.alertsAllowed;
    default:
      return false;
  }
}

/**
 * Check if usage is within plan limits
 */
function isWithinLimit(planId, currentUsage, limitType) {
  const plan = getPlan(planId);
  
  switch (limitType) {
    case 'scans':
      if (plan.maxScansPerMonth === -1) return true; // unlimited
      return currentUsage < plan.maxScansPerMonth;
    case 'sites':
      if (plan.maxSites === -1) return true; // unlimited
      return currentUsage < plan.maxSites;
    default:
      return false;
  }
}

/**
 * Get human-readable error message for limit exceeded
 */
function getLimitExceededMessage(planId, limitType) {
  const plan = getPlan(planId);
  
  switch (limitType) {
    case 'scans':
      return `You've reached your monthly scan limit for the ${plan.name} plan (${plan.maxScansPerMonth} scans/month). Upgrade to continue scanning.`;
    case 'sites':
      return `You've reached your site limit for the ${plan.name} plan (${plan.maxSites} site${plan.maxSites > 1 ? 's' : ''}). Upgrade to add more sites.`;
    case 'liveGuardian':
      return `Live Guardian monitoring is not available on the ${plan.name} plan. Upgrade to Pro to enable continuous monitoring.`;
    case 'ciMode':
      return `CI/CD mode is not available on the ${plan.name} plan. Upgrade to Pro to enable CI integration.`;
    case 'alerts':
      return `Email alerts are not available on the ${plan.name} plan. Upgrade to Pro to enable notifications.`;
    default:
      return `This feature is not available on your current plan. Upgrade to unlock more features.`;
  }
}

/**
 * Get all plans for display
 */
function getAllPlans() {
  return [PLANS.FREE, PLANS.PRO, PLANS.BUSINESS];
}

module.exports = {
  PLANS,
  getPlan,
  planAllows,
  isWithinLimit,
  getLimitExceededMessage,
  getAllPlans,
};
