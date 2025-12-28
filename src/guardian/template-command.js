/**
 * Template Command
 * 
 * Generate minimal config templates:
 *   guardian template saas
 *   guardian template shop
 *   guardian template landing
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  saas: {
    name: 'SaaS Startup Check',
    description: 'Verify core SaaS flows: signup, login, dashboard',
    intent: {
      category: 'product_type',
      value: 'saas',
      confidence: 1.0
    },
    journeys: [
      {
        id: 'signup_flow',
        name: 'User Signup',
        description: 'Verify signup journey completes',
        steps: [
          { action: 'navigate', target: '/', name: 'Home' },
          { action: 'click', target: 'a[href*="/signup"], button:has-text("Sign up")', name: 'Click signup' },
          { action: 'wait', ms: 2000 },
          { action: 'screenshot', name: 'Signup form loaded' }
        ],
        criticality: 'CRITICAL',
        onFailure: 'FAIL'
      },
      {
        id: 'landing_page',
        name: 'Landing Page Load',
        description: 'Verify homepage loads without errors',
        steps: [
          { action: 'navigate', target: '/', name: 'Home' },
          { action: 'screenshot', name: 'Homepage loaded' }
        ],
        criticality: 'CRITICAL',
        onFailure: 'WARN'
      }
    ],
    policy: {
      failOnSeverity: 'CRITICAL',
      maxWarnings: 10,
      requireBaseline: false
    }
  },

  shop: {
    name: 'E-Commerce Shop Check',
    description: 'Verify core shop flows: browse, add to cart, checkout',
    intent: {
      category: 'product_type',
      value: 'ecommerce',
      confidence: 1.0
    },
    journeys: [
      {
        id: 'browse_products',
        name: 'Browse Products',
        description: 'Verify product catalog loads',
        steps: [
          { action: 'navigate', target: '/', name: 'Home' },
          { action: 'click', target: 'a[href*="/shop"], a[href*="/products"], button:has-text("Shop")', name: 'Go to shop' },
          { action: 'wait', ms: 2000 },
          { action: 'screenshot', name: 'Products page' }
        ],
        criticality: 'CRITICAL',
        onFailure: 'FAIL'
      },
      {
        id: 'add_to_cart',
        name: 'Add to Cart',
        description: 'Verify add-to-cart flow',
        steps: [
          { action: 'navigate', target: '/', name: 'Home' },
          { action: 'click', target: 'a[href*="/shop"], a[href*="/products"]', name: 'Go to shop' },
          { action: 'wait', ms: 2000 },
          { action: 'click', target: 'button:has-text("Add"), button:has-text("Cart")', name: 'Add item' },
          { action: 'screenshot', name: 'Cart updated' }
        ],
        criticality: 'CRITICAL',
        onFailure: 'WARN'
      }
    ],
    policy: {
      failOnSeverity: 'CRITICAL',
      maxWarnings: 10,
      requireBaseline: false
    }
  },

  landing: {
    name: 'Landing Page Check',
    description: 'Verify landing page loads and core CTAs work',
    intent: {
      category: 'product_type',
      value: 'landing',
      confidence: 1.0
    },
    journeys: [
      {
        id: 'page_load',
        name: 'Page Load',
        description: 'Verify landing page loads',
        steps: [
          { action: 'navigate', target: '/', name: 'Home' },
          { action: 'screenshot', name: 'Landing page' }
        ],
        criticality: 'CRITICAL',
        onFailure: 'FAIL'
      },
      {
        id: 'cta_click',
        name: 'Call-to-Action',
        description: 'Verify main CTA is clickable',
        steps: [
          { action: 'navigate', target: '/', name: 'Home' },
          { action: 'click', target: 'button:has-text("Get started"), button:has-text("Start"), button:has-text("Sign up"), a[href*="/signup"]', name: 'Click CTA' },
          { action: 'screenshot', name: 'CTA works' }
        ],
        criticality: 'CRITICAL',
        onFailure: 'WARN'
      }
    ],
    policy: {
      failOnSeverity: 'CRITICAL',
      maxWarnings: 5,
      requireBaseline: false
    }
  }
};

/**
 * Generate config file from template
 * @param {string} templateName - saas, shop, or landing
 * @param {object} options - Generation options
 * @returns {object} Result with generated file path
 */
function generateTemplate(templateName, options = {}) {
  const cwd = options.cwd || process.cwd();
  const outputFile = options.output || `guardian-${templateName}.json`;
  const outputPath = path.join(cwd, outputFile);

  if (!TEMPLATES[templateName]) {
    throw new Error(`Unknown template: ${templateName}. Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }

  const template = TEMPLATES[templateName];
  const content = JSON.stringify(template, null, 2);

  fs.writeFileSync(outputPath, content, 'utf-8');

  return {
    success: true,
    template: templateName,
    outputPath,
    message: `Generated ${templateName} template: ${outputFile}`
  };
}

/**
 * List available templates
 * @returns {array} Array of template names with descriptions
 */
function listTemplates() {
  return Object.entries(TEMPLATES).map(([name, config]) => ({
    name,
    description: config.description,
    journeys: config.journeys.length
  }));
}

module.exports = {
  generateTemplate,
  listTemplates,
  TEMPLATES
};
