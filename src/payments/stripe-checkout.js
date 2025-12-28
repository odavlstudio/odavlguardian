/**
 * ODAVL Guardian Stripe Integration
 * Real Stripe checkout for PRO and BUSINESS plans
 */

const { PLANS } = require('../plans/plan-definitions');
const { setCurrentPlan } = require('../plans/plan-manager');

// Stripe configuration
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Create Stripe checkout session
 * This is called from the website when user clicks "Upgrade"
 */
async function createCheckoutSession(planId, successUrl, cancelUrl) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  
  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  const plan = PLANS[planId.toUpperCase()];
  
  if (!plan || !plan.stripePriceId) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      planId: plan.id,
    },
  });
  
  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Handle Stripe webhook events
 * Called when payment succeeds or subscription changes
 */
async function handleWebhook(requestBody, signature) {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhooks not configured');
  }
  
  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      requestBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const planId = session.metadata.planId;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      
      // Activate the plan
      setCurrentPlan(planId, {
        customerId,
        subscriptionId,
      });
      
      return {
        success: true,
        planId,
        customerId,
      };
    }
    
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      
      if (subscription.status === 'active') {
        // Keep subscription active
        return { success: true, status: 'active' };
      } else if (['canceled', 'unpaid'].includes(subscription.status)) {
        // Downgrade to FREE
        setCurrentPlan('free');
        return { success: true, status: 'downgraded' };
      }
      
      return { success: true, status: subscription.status };
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
      return { success: true, ignored: true };
  }
}

/**
 * Get Stripe public key for client-side
 */
function getStripePublicKey() {
  return STRIPE_PUBLIC_KEY;
}

/**
 * Create customer portal session
 * Allows users to manage their subscription
 */
async function createPortalSession(customerId, returnUrl) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }
  
  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return {
    url: session.url,
  };
}

/**
 * Verify Stripe is configured
 */
function isStripeConfigured() {
  return !!(STRIPE_SECRET_KEY && STRIPE_PUBLIC_KEY);
}

/**
 * Get checkout URL for a plan
 * Helper for CLI
 */
function getCheckoutUrl(planId) {
  const baseUrl = process.env.GUARDIAN_WEBSITE_URL || 'https://guardian.odavl.com';
  return `${baseUrl}/checkout?plan=${planId}`;
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getStripePublicKey,
  createPortalSession,
  isStripeConfigured,
  getCheckoutUrl,
};
