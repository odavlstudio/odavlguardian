/**
 * Guardian Flow Registry (Phase 3)
 * Curated intent flows executed via Flow Executor
 */

const DEFAULT_FLOWS = ['signup_flow', 'login_flow', 'checkout_flow'];

const flowDefinitions = {
  signup_flow: {
    id: 'signup_flow',
    name: 'Intent: Account Signup',
    description: 'User creates an account successfully',
    riskCategory: 'LEAD',
    steps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_signup', type: 'click', target: 'a[data-guardian="account-signup-link"], a:has-text("Account Signup")', description: 'Open account signup page', waitForNavigation: true },
      { id: 'fill_email', type: 'type', target: '[data-guardian="signup-email"]', value: 'newuser@example.com', description: 'Enter signup email' },
      { id: 'fill_password', type: 'type', target: '[data-guardian="signup-password"]', value: 'P@ssword123', description: 'Enter signup password' },
      { id: 'submit', type: 'click', target: '[data-guardian="signup-account-submit"], button:has-text("Sign up")', description: 'Submit signup form' },
      { id: 'wait_success', type: 'waitFor', target: '[data-guardian="signup-account-success"]', description: 'Wait for signup success', timeout: 7000 }
    ]
  },
  login_flow: {
    id: 'login_flow',
    name: 'Intent: Account Login',
    description: 'User logs in successfully',
    riskCategory: 'TRUST/UX',
    steps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_login', type: 'click', target: 'a[data-guardian="account-login-link"], a:has-text("Login"), a[href*="login"]', description: 'Open login page', waitForNavigation: true },
      { id: 'fill_email', type: 'type', target: '[data-guardian="login-email"]', value: 'user@example.com', description: 'Enter login email' },
      { id: 'fill_password', type: 'type', target: '[data-guardian="login-password"]', value: 'password123', description: 'Enter login password' },
      { id: 'submit', type: 'click', target: '[data-guardian="login-submit"], button:has-text("Login")', description: 'Submit login form' },
      { id: 'wait_success', type: 'waitFor', target: '[data-guardian="login-success"]', description: 'Wait for login success', timeout: 7000 }
    ]
  },
  checkout_flow: {
    id: 'checkout_flow',
    name: 'Intent: Checkout',
    description: 'User reviews cart and places order (no payment)',
    riskCategory: 'REVENUE',
    steps: [
      { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Navigate to home page' },
      { id: 'open_checkout', type: 'click', target: 'a[data-guardian="checkout-link"], a:has-text("Checkout"), a[href*="checkout"]', description: 'Open checkout page', waitForNavigation: true },
      { id: 'place_order', type: 'click', target: '[data-guardian="checkout-place-order"], button:has-text("Place order"), button:has-text("Place Order")', description: 'Place order' },
      { id: 'wait_success', type: 'waitFor', target: '[data-guardian="checkout-success"]', description: 'Wait for order confirmation', timeout: 7000 }
    ]
  }
};

function getFlowDefinition(flowId) {
  return flowDefinitions[flowId] || null;
}

function getDefaultFlowIds() {
  return DEFAULT_FLOWS.slice();
}

function listFlowDefinitions() {
  return Object.values(flowDefinitions);
}

module.exports = {
  getFlowDefinition,
  getDefaultFlowIds,
  listFlowDefinitions
};
