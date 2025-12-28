/**
 * Journey Definitions - Preset journeys for different product types
 * Each journey is a deterministic sequence of steps
 */

function getJourneyDefinition(preset = 'saas') {
  switch (preset) {
    case 'saas':
      return getSaasjJourney();
    case 'shop':
    case 'ecommerce':
      return getShopJourney();
    case 'landing':
      return getLandingJourney();
    default:
      return getSaasjJourney();
  }
}

/**
 * SAAS Journey: Homepage → Find CTA → Signup flow
 */
function getSaasjJourney() {
  return {
    name: 'SAAS Signup Flow',
    description: 'Test critical path: homepage → locate signup CTA → click → verify signup page',
    preset: 'saas',
    steps: [
      {
        id: 'step-1-homepage',
        name: 'Load homepage',
        action: 'navigate',
        target: '/',
        description: 'User arrives at the homepage'
      },
      {
        id: 'step-2-find-cta',
        name: 'Find signup CTA',
        action: 'find_cta',
        target: null,
        description: 'Locate primary signup/CTA button (sign up, get started, start, register, pricing, etc)',
        expectedIndicator: {
          textMatch: ['sign up', 'signup', 'get started', 'start', 'register', 'pricing'],
          tagNames: ['A', 'BUTTON']
        }
      },
      {
        id: 'step-3-verify-homepage',
        name: 'Verify homepage loaded',
        action: 'navigate',
        target: '/pricing',
        description: 'If CTA not found, try /pricing as fallback'
      }
    ]
  };
}

/**
 * Shop Journey: Homepage → Find product CTA → Checkout
 */
function getShopJourney() {
  return {
    name: 'Shop Checkout Flow',
    description: 'Test critical path: homepage → find product/checkout CTA → click → verify flow',
    preset: 'shop',
    steps: [
      {
        id: 'step-1-homepage',
        name: 'Load homepage',
        action: 'navigate',
        target: '/',
        description: 'User arrives at the homepage'
      },
      {
        id: 'step-2-find-product',
        name: 'Find product CTA',
        action: 'find_cta',
        target: null,
        description: 'Locate primary product/buy/checkout button',
        expectedIndicator: {
          textMatch: ['buy', 'shop', 'add to cart', 'checkout', 'order', 'purchase'],
          tagNames: ['A', 'BUTTON']
        }
      },
      {
        id: 'step-3-navigate-shop',
        name: 'Navigate to shop',
        action: 'navigate',
        target: '/shop',
        description: 'If CTA not found, try /shop as fallback'
      }
    ]
  };
}

/**
 * Landing Page Journey: Simple homepage test
 */
function getLandingJourney() {
  return {
    name: 'Landing Page Journey',
    description: 'Test: homepage → find contact/CTA → verify page load',
    preset: 'landing',
    steps: [
      {
        id: 'step-1-homepage',
        name: 'Load homepage',
        action: 'navigate',
        target: '/',
        description: 'User arrives at the homepage'
      },
      {
        id: 'step-2-find-cta',
        name: 'Find primary CTA',
        action: 'find_cta',
        target: null,
        description: 'Locate primary call-to-action element',
        expectedIndicator: {
          textMatch: ['contact', 'get started', 'sign up', 'learn more', 'demo'],
          tagNames: ['A', 'BUTTON']
        }
      }
    ]
  };
}

module.exports = {
  getJourneyDefinition,
  getSaasjJourney,
  getShopJourney,
  getLandingJourney
};
