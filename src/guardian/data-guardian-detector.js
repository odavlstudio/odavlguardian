/**
 * Data Guardian Attribute Detector
 * 
 * Deterministic detection of data-guardian attributes for stable element targeting.
 * Supports attribute variants and tokenized values.
 * 
 * LAYER 1 in the detection priority hierarchy (highest priority).
 */

const { normalizeText } = require('./semantic-targets');

/**
 * Supported data-guardian attribute targets
 */
const GUARDIAN_TARGETS = {
  CONTACT: 'contact',
  ABOUT: 'about',
  FORM: 'form',
  SUBMIT: 'submit'
};

/**
 * Find elements by data-guardian attribute
 * 
 * @param {Page} page - Playwright page object
 * @param {string} target - Target to search for (contact, about, form, submit)
 * @returns {Promise<Array>} Array of matching elements with metadata
 */
async function findByGuardianAttribute(page, target) {
  if (!GUARDIAN_TARGETS[target.toUpperCase()]) {
    throw new Error(`Unsupported guardian target: ${target}`);
  }

  const normalizedTarget = target.toLowerCase();

  try {
    const results = await page.evaluate((targetName) => {
      const elements = [];

      // Rule 1: Exact match on data-guardian attribute
      const exactMatches = document.querySelectorAll(`[data-guardian="${targetName}"]`);
      for (const el of exactMatches) {
        elements.push({
          element: el,
          tagName: el.tagName.toLowerCase(),
          text: el.textContent?.trim() || '',
          href: el.href || el.getAttribute('href') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || '',
          dataGuardian: el.getAttribute('data-guardian'),
          dataGuardianVariant: null,
          matchType: 'exact', // Exact attribute match
          confidence: 'high'
        });
      }

      // Rule 2: Tokenized match (e.g., "contact primary" contains "contact")
      const allGuardianElements = document.querySelectorAll('[data-guardian]');
      for (const el of allGuardianElements) {
        const dataGuardian = el.getAttribute('data-guardian') || '';
        const tokens = dataGuardian.split(/[\s\-_]+/).map(t => t.toLowerCase());

        if (tokens.includes(targetName)) {
          // Only add if not already in exact matches
          const alreadyFound = Array.from(exactMatches).includes(el);
          if (!alreadyFound) {
            elements.push({
              element: el,
              tagName: el.tagName.toLowerCase(),
              text: el.textContent?.trim() || '',
              href: el.href || el.getAttribute('href') || '',
              ariaLabel: el.getAttribute('aria-label') || '',
              title: el.getAttribute('title') || '',
              dataGuardian: el.getAttribute('data-guardian'),
              dataGuardianVariant: null,
              matchType: 'tokenized', // Tokenized match
              confidence: 'high'
            });
          }
        }
      }

      // Rule 3: Variant attributes (e.g., data-guardian-role="contact")
      const variantAttr = `data-guardian-${targetName}`;
      const variantMatches = document.querySelectorAll(`[${variantAttr}]`);
      for (const el of variantMatches) {
        const variantValue = el.getAttribute(variantAttr);
        elements.push({
          element: el,
          tagName: el.tagName.toLowerCase(),
          text: el.textContent?.trim() || '',
          href: el.href || el.getAttribute('href') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || '',
          dataGuardian: el.getAttribute('data-guardian'),
          dataGuardianVariant: variantAttr, // Track the variant attribute name
          matchType: 'variant', // Variant attribute match
          confidence: 'medium'
        });
      }

      return elements;
    }, normalizedTarget);

    return results;
  } catch (error) {
    console.warn(`Failed to find elements by guardian attribute: ${error.message}`);
    return [];
  }
}

/**
 * Check if element has any data-guardian attribute
 * Returns the attribute value and match type
 */
async function getGuardianAttribute(page, selector) {
  try {
    const result = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const dataGuardian = el.getAttribute('data-guardian');
      const allAttrs = el.attributes;
      let variantAttr = null;

      // Check for variant attributes
      for (const attr of allAttrs) {
        if (attr.name.startsWith('data-guardian-')) {
          variantAttr = {
            name: attr.name,
            value: attr.value
          };
          break;
        }
      }

      return {
        dataGuardian: dataGuardian,
        variantAttribute: variantAttr,
        hasGuardianAttr: !!dataGuardian || !!variantAttr
      };
    }, selector);

    return result;
  } catch (error) {
    console.warn(`Failed to get guardian attribute: ${error.message}`);
    return null;
  }
}

/**
 * Build CSS selector for a data-guardian attribute
 */
function buildGuardianSelector(target, variant = null) {
  if (variant) {
    // Variant attribute selector
    return `[data-guardian-${target}]`;
  } else {
    // Standard data-guardian attribute selector
    return `[data-guardian="${target}"]`;
  }
}

/**
 * Check if an element's data-guardian value matches a target
 */
function matchesGuardianTarget(elementDataGuardian, target) {
  if (!elementDataGuardian) return false;

  const normalized = normalizeText(elementDataGuardian);
  const normalizedTarget = normalizeText(target);

  // Exact match
  if (normalized === normalizedTarget) return true;

  // Tokenized match (split by whitespace/hyphens)
  const tokens = normalized.split(/[\s\-_]+/);
  if (tokens.includes(normalizedTarget)) return true;

  return false;
}

module.exports = {
  findByGuardianAttribute,
  getGuardianAttribute,
  buildGuardianSelector,
  matchesGuardianTarget,
  GUARDIAN_TARGETS
};
