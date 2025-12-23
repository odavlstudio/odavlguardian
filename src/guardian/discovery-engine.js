/**
 * Discovery Engine (Phase 4)
 * 
 * Auto-discovers real user interactions deterministically.
 * - Crawls pages up to limit
 * - Extracts candidate interactions: links, buttons, forms
 * - Applies safety model: DENY risky, ALLOW safe
 * - Executes safe interactions in safe exploration mode
 * - Captures outcomes: success, friction, failure
 * 
 * NO AI. Pure deterministic heuristics.
 */

const url = require('url');

/**
 * @typedef {Object} DiscoveryConfig
 * @property {string} baseUrl - base URL to start from
 * @property {number} [maxPages=25] - max pages to visit
 * @property {number} [maxInteractionsPerPage=10] - max interactions per page
 * @property {boolean} [executeInteractions=false] - whether to actually execute interactions
 * @property {number} [timeout=20000] - ms timeout per interaction
 * @property {Array<string>} [startUrls] - additional URLs to start from
 */

/**
 * @typedef {Object} Interaction
 * @property {string} interactionId - unique ID (e.g., "btn-checkout-0")
 * @property {string} pageUrl - URL where interaction was found
 * @property {string} type - 'NAVIGATE' (link), 'CLICK' (button), 'FORM_FILL' (form)
 * @property {string} interactionClass - 'NAVIGATION', 'ACTION', 'SUBMISSION', 'TOGGLE' (Phase 2)
 * @property {string} selector - CSS/XPath selector to find element
 * @property {string} [selectorStrategy] - 'css' or 'xpath'
 * @property {string} [text] - visible text of element
 * @property {string} [ariaLabel] - aria-label if present
 * @property {string} [href] - for NAVIGATE type
 * @property {boolean} [isRisky] - true if matches deny patterns
 * @property {string} [riskReason] - why it's risky
 * @property {string} [targetUrl] - where link goes (for NAVIGATE)
 * @property {boolean} [isFormSafe] - true if data-guardian-safe="true" or known safe form
 * @property {Array<string>} [formFields] - field types in form (email, text, password)
 * @property {number} [confidenceScore] - 0-100, higher = more confident it's safe/useful (Phase 2)
 */

/**
 * @typedef {Object} InteractionResult
 * @property {string} interactionId - ID of interaction executed
 * @property {string} pageUrl - URL where it was found
 * @property {string} type - NAVIGATE/CLICK/FORM_FILL
 * @property {string} selector - selector used
 * @property {string} outcome - 'SUCCESS', 'FAILURE', 'FRICTION'
 * @property {string} [notes] - details (e.g., target URL, error message)
 * @property {number} [durationMs] - execution time
 * @property {string} [errorMessage] - if FAILURE
 * @property {string} [evidencePath] - path to screenshot if captured
 */

/**
 * @typedef {Object} DiscoveryResult
 * @property {string[]} pagesVisited - URLs of all pages visited
 * @property {number} pagesVisitedCount - total count
 * @property {number} interactionsDiscovered - total count of candidates
 * @property {number} interactionsExecuted - total count executed
 * @property {number} interactionsByType - { NAVIGATE: n, CLICK: n, FORM_FILL: n }
 * @property {number} interactionsByRisk - { risky: n, safe: n }
 * @property {Interaction[]} interactions - all discovered interactions (Phase 2)
 * @property {InteractionResult[]} results - detailed outcomes (failures + notable successes)
 * @property {string} [summary] - human-readable summary
 */

// ============================================================================
// SAFETY MODEL (NON-NEGOTIABLE)
// ============================================================================

const RISKY_TEXT_PATTERNS = [
  'delete', 'remove', 'logout', 'log out', 'sign out', 'signout',
  'unsubscribe', 'cancel', 'cancel order', 'payment', 'buy', 'order',
  'confirm purchase', 'purchase', 'checkout', 'pay now', 'place order',
  'close account', 'deactivate'
];

const RISKY_HREF_PATTERNS = [
  /\/logout\b/, /\/log-out\b/, /\/signout\b/, /\/sign-out\b/,
  /\/delete\b/, /\/remove\b/, /\/unsubscribe\b/, /\/cancel\b/,
  /\/checkout\b/, /\/pay\b/, /\/payment\b/, /\/purchase\b/,
  /\/admin\b/, /\/admin\//, /\/settings\/danger\b/,
  /\/account\/close\b/, /\/deactivate\b/
];

const KNOWN_SAFE_FORMS = [
  'newsletter', 'newsletter_signup', 'contact', 'contact_form', 
  'search', 'subscribe', 'login', 'signup', 'register'
];

/**
 * Check if element text/label contains risky keywords
 */
function isRiskyText(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return RISKY_TEXT_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * Check if href contains risky patterns
 */
function isRiskyHref(href) {
  if (!href) return false;
  return RISKY_HREF_PATTERNS.some(pattern => pattern.test(href));
}

/**
 * Evaluate interaction risk
 */
function assessInteractionRisk(interaction, baseUrl) {
  const { text = '', ariaLabel = '', href = '', type, formFields = [] } = interaction;

  // NAVIGATE (links): mostly safe by default
  if (type === 'NAVIGATE') {
    if (isRiskyHref(href)) {
      return { isRisky: true, reason: `Href matches risk pattern: ${href}` };
    }
    return { isRisky: false, reason: '' };
  }

  // CLICK (buttons): check text and aria-label
  if (type === 'CLICK') {
    if (isRiskyText(text) || isRiskyText(ariaLabel)) {
      return { 
        isRisky: true, 
        reason: `Button text/label risky: "${text || ariaLabel}"` 
      };
    }
    return { isRisky: false, reason: '' };
  }

  // FORM_FILL: check if form is explicitly safe or known
  if (type === 'FORM_FILL') {
    // Always allow if marked data-guardian-safe="true"
    if (interaction.isFormSafe) {
      return { isRisky: false, reason: 'Form marked data-guardian-safe="true"' };
    }
    // Allow if matches known safe form patterns
    const formId = interaction.formId || '';
    if (KNOWN_SAFE_FORMS.some(pattern => formId.includes(pattern))) {
      return { isRisky: false, reason: `Form matches known safe pattern: ${formId}` };
    }
    // Otherwise risky (don't fill unknown forms)
    return { isRisky: true, reason: 'Unknown form - not marked safe' };
  }

  return { isRisky: false, reason: '' };
}

/**
 * Phase 2: Classify interaction into high-level category
 * - NAVIGATION: links, menu items (changes page)
 * - ACTION: buttons without submission (modal, accordion, etc.)
 * - SUBMISSION: forms with submit buttons
 * - TOGGLE: language/theme switches
 */
function classifyInteraction(interaction) {
  const { type, text = '', ariaLabel = '', href = '', formFields = [] } = interaction;
  const combinedText = `${text} ${ariaLabel}`.toLowerCase();

  // TOGGLE detection: language, theme, etc.
  if (combinedText.includes('language') || combinedText.includes('lang') ||
      combinedText.includes('theme') || combinedText.includes('dark mode') ||
      combinedText.includes('light mode')) {
    return 'TOGGLE';
  }

  // NAVIGATE: all links
  if (type === 'NAVIGATE') {
    return 'NAVIGATION';
  }

  // SUBMISSION: forms
  if (type === 'FORM_FILL') {
    return 'SUBMISSION';
  }

  // CLICK: categorize as ACTION by default (could be modal, accordion, etc.)
  if (type === 'CLICK') {
    // If button text suggests submission, classify as SUBMISSION
    if (combinedText.includes('submit') || combinedText.includes('send') || 
        combinedText.includes('post') || combinedText.includes('save')) {
      return 'SUBMISSION';
    }
    return 'ACTION';
  }

  return 'ACTION';
}

/**
 * Phase 2: Calculate confidence/safety score for interaction (0-100)
 * Higher = more confident it's safe and useful to auto-test
 */
function calculateConfidenceScore(interaction) {
  let score = 50; // base

  // Risky = 0
  if (interaction.isRisky) return 0;

  // Has clear text/label: +20
  if (interaction.text && interaction.text.length > 2) {
    score += 20;
  }

  // Has aria-label: +10
  if (interaction.ariaLabel && interaction.ariaLabel.length > 2) {
    score += 10;
  }

  // NAVIGATE type: inherently safer: +10
  if (interaction.type === 'NAVIGATE') {
    score += 10;
  }

  // Form marked safe: +20
  if (interaction.isFormSafe) {
    score += 20;
  }

  // Cap at 100
  return Math.min(score, 100);
}


// ============================================================================
// DISCOVERY ENGINE
// ============================================================================

class DiscoveryEngine {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl;
    this.maxPages = config.maxPages || 25;
    this.maxInteractionsPerPage = config.maxInteractionsPerPage || 10;
    this.executeInteractions = config.executeInteractions || false;
    this.timeout = config.timeout || 20000;
    this.startUrls = config.startUrls || [this.baseUrl];
    this.browser = config.browser;
    this.page = null;

    this.visited = new Set();
    this.queue = [];
    this.interactions = [];
    this.results = [];
  }

  /**
   * Normalize URL (remove fragments, sort params)
   */
  normalizeUrl(urlStr) {
    try {
      const u = new URL(urlStr, this.baseUrl);
      u.hash = ''; // Remove fragments
      return u.toString();
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is same-origin
   */
  isSameOrigin(urlStr) {
    try {
      const u = new URL(urlStr, this.baseUrl);
      const base = new URL(this.baseUrl);
      return u.origin === base.origin;
    } catch {
      return false;
    }
  }

  /**
   * Extract links from page
   */
  async extractLinks(pageUrl, page) {
    const candidates = [];
    try {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map((a, idx) => ({
          href: a.getAttribute('href'),
          text: a.innerText.trim().substring(0, 100),
          ariaLabel: a.getAttribute('aria-label') || '',
          visible: a.offsetHeight > 0 && a.offsetWidth > 0,
          idx
        }));
      });

      for (const link of links) {
        // Skip mailto, tel, javascript, fragments-only
        if (!link.href || link.href.startsWith('mailto:') || 
            link.href.startsWith('tel:') || link.href.startsWith('javascript:')) {
          continue;
        }

        // Check same-origin
        if (!this.isSameOrigin(link.href)) {
          continue;
        }

        // Check if not blocked
        if (!link.visible) {
          continue;
        }

        const normalized = this.normalizeUrl(link.href);
        if (!normalized) continue;

        candidates.push({
          type: 'NAVIGATE',
          selector: `a[href="${link.href}"]`,
          selectorStrategy: 'css',
          text: link.text,
          ariaLabel: link.ariaLabel,
          href: link.href,
          targetUrl: normalized
        });
      }
    } catch (e) {
      // Page evaluation error, skip
    }

    return candidates;
  }

  /**
   * Extract buttons from page
   */
  async extractButtons(pageUrl, page) {
    const candidates = [];
    try {
      const buttons = await page.evaluate(() => {
        const btns = [];
        // <button> elements
        document.querySelectorAll('button').forEach((btn, idx) => {
          btns.push({
            type: 'button',
            text: btn.innerText.trim().substring(0, 100),
            ariaLabel: btn.getAttribute('aria-label') || '',
            disabled: btn.disabled,
            visible: btn.offsetHeight > 0 && btn.offsetWidth > 0,
            idx
          });
        });
        // [role=button] elements
        document.querySelectorAll('[role="button"]').forEach((btn, idx) => {
          btns.push({
            type: 'role-button',
            text: btn.innerText.trim().substring(0, 100),
            ariaLabel: btn.getAttribute('aria-label') || '',
            disabled: btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true',
            visible: btn.offsetHeight > 0 && btn.offsetWidth > 0,
            idx
          });
        });
        // input[type=submit]
        document.querySelectorAll('input[type="submit"]').forEach((btn, idx) => {
          btns.push({
            type: 'submit',
            text: btn.value || btn.getAttribute('aria-label') || 'Submit',
            ariaLabel: btn.getAttribute('aria-label') || '',
            disabled: btn.disabled,
            visible: btn.offsetHeight > 0 && btn.offsetWidth > 0,
            idx
          });
        });
        return btns;
      });

      let btnIdx = 0;
      for (const btn of buttons) {
        if (btn.disabled || !btn.visible) continue;

        candidates.push({
          type: 'CLICK',
          selector: btn.type === 'button' ? `button:nth-of-type(${btn.idx + 1})` : 
                    btn.type === 'submit' ? `input[type="submit"]:nth-of-type(${btn.idx + 1})` :
                    `[role="button"]:nth-of-type(${btn.idx + 1})`,
          selectorStrategy: 'css',
          text: btn.text,
          ariaLabel: btn.ariaLabel
        });

        btnIdx++;
      }
    } catch (e) {
      // Skip
    }

    return candidates;
  }

  /**
   * Extract forms from page
   */
  async extractForms(pageUrl, page) {
    const candidates = [];
    try {
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((form, fidx) => {
          const inputs = Array.from(form.querySelectorAll('input'));
          const fieldTypes = new Set();
          inputs.forEach(input => {
            const type = input.type.toLowerCase();
            if (['email', 'text', 'password', 'tel', 'url'].includes(type)) {
              fieldTypes.add(type);
            }
          });

          return {
            id: form.id || form.name || `form-${fidx}`,
            action: form.action || '',
            fieldTypes: Array.from(fieldTypes),
            visible: form.offsetHeight > 0 && form.offsetWidth > 0,
            hasGuardianSafe: form.getAttribute('data-guardian-safe') === 'true',
            inputCount: inputs.length,
            idx: fidx
          };
        });
      });

      for (const form of forms) {
        if (!form.visible || form.inputCount === 0) continue;

        candidates.push({
          type: 'FORM_FILL',
          selector: form.id ? `form#${form.id}` : `form:nth-of-type(${form.idx + 1})`,
          selectorStrategy: 'css',
          formId: form.id || form.name || '',
          formFields: form.fieldTypes,
          isFormSafe: form.hasGuardianSafe,
          text: `Form: ${form.id || `form-${form.idx}`}`,
          ariaLabel: ''
        });
      }
    } catch (e) {
      // Skip
    }

    return candidates;
  }

  /**
   * Visit a page and extract interactions
   */
  async visitPage(pageUrl) {
    if (this.visited.size >= this.maxPages) return [];
    if (this.visited.has(pageUrl)) return [];

    this.visited.add(pageUrl);

    try {
      await this.page.goto(pageUrl, { waitUntil: 'networkidle', timeout: this.timeout });
      
      const candidates = [];
      const links = await this.extractLinks(pageUrl, this.page);
      const buttons = await this.extractButtons(pageUrl, this.page);
      const forms = await this.extractForms(pageUrl, this.page);

      candidates.push(...links);
      candidates.push(...buttons);
      candidates.push(...forms);

      // Limit per page
      const limited = candidates.slice(0, this.maxInteractionsPerPage);

      // Assess risk for each
      const interactions = limited.map((cand, idx) => {
        const riskAssess = assessInteractionRisk(cand, this.baseUrl);
        const interactionClass = classifyInteraction(cand);
        const confidenceScore = calculateConfidenceScore({
          ...cand,
          isRisky: riskAssess.isRisky
        });

        return {
          interactionId: `${cand.type.toLowerCase()}-${idx}`,
          pageUrl,
          ...cand,
          isRisky: riskAssess.isRisky,
          riskReason: riskAssess.reason,
          interactionClass,
          confidenceScore
        };
      });

      // Queue new NAVIGATE targets
      for (const inter of interactions) {
        if (inter.type === 'NAVIGATE' && inter.targetUrl && !this.visited.has(inter.targetUrl)) {
          this.queue.push(inter.targetUrl);
        }
      }

      return interactions;
    } catch (e) {
      // Page failed to load
      return [];
    }
  }

  /**
   * Execute a single interaction
   */
  async executeInteraction(interaction, page) {
    const startMs = Date.now();
    try {
      if (interaction.type === 'NAVIGATE') {
        await page.goto(interaction.targetUrl, { waitUntil: 'networkidle2', timeout: this.timeout });
        const durationMs = Date.now() - startMs;
        return {
          interactionId: interaction.interactionId,
          pageUrl: interaction.pageUrl,
          type: interaction.type,
          selector: interaction.selector,
          outcome: 'SUCCESS',
          notes: `Navigated to ${interaction.targetUrl}`,
          durationMs,
          targetUrl: interaction.targetUrl
        };
      } else if (interaction.type === 'CLICK') {
        const prevUrl = page.url();
        await page.click(interaction.selector);
        await page.waitForNavigation({ timeout: 2000 }).catch(() => {});
        const durationMs = Date.now() - startMs;
        const newUrl = page.url();
        return {
          interactionId: interaction.interactionId,
          pageUrl: interaction.pageUrl,
          type: interaction.type,
          selector: interaction.selector,
          outcome: 'SUCCESS',
          notes: newUrl !== prevUrl ? `Navigated to ${newUrl}` : 'Click executed',
          durationMs,
          targetUrl: newUrl
        };
      } else if (interaction.type === 'FORM_FILL') {
        // Fill visible input fields (email, text, password)
        const filled = await page.evaluate((selector) => {
          const form = document.querySelector(selector);
          if (!form) return 0;
          const inputs = form.querySelectorAll('input[type="email"], input[type="text"], input[type="password"]');
          let filledCount = 0;
          inputs.forEach((input, idx) => {
            if (input.type === 'email') {
              input.value = `test${idx}@example.com`;
              filledCount++;
            } else if (input.type === 'password') {
              input.value = 'TestPass123!';
              filledCount++;
            } else if (input.type === 'text') {
              input.value = `Test input ${idx}`;
              filledCount++;
            }
          });
          return filledCount;
        }, interaction.selector);

        const durationMs = Date.now() - startMs;
        return {
          interactionId: interaction.interactionId,
          pageUrl: interaction.pageUrl,
          type: interaction.type,
          selector: interaction.selector,
          outcome: 'SUCCESS',
          notes: `Filled ${filled} form fields`,
          durationMs
        };
      }

      return {
        interactionId: interaction.interactionId,
        pageUrl: interaction.pageUrl,
        type: interaction.type,
        selector: interaction.selector,
        outcome: 'FAILURE',
        errorMessage: 'Unknown interaction type',
        durationMs: Date.now() - startMs
      };
    } catch (e) {
      const durationMs = Date.now() - startMs;
      return {
        interactionId: interaction.interactionId,
        pageUrl: interaction.pageUrl,
        type: interaction.type,
        selector: interaction.selector,
        outcome: 'FAILURE',
        errorMessage: e.message.substring(0, 200),
        durationMs
      };
    }
  }

  /**
   * Main discovery crawl
   */
  async discover(page) {
    this.page = page;
    this.queue = [...this.startUrls];

    // BFS crawl
    while (this.queue.length > 0 && this.visited.size < this.maxPages) {
      const urlStr = this.queue.shift();
      const normalized = this.normalizeUrl(urlStr);
      if (!normalized) continue;

      const pageInteractions = await this.visitPage(normalized);
      this.interactions.push(...pageInteractions);
    }

    // Execute safe interactions if enabled
    if (this.executeInteractions && this.page) {
      const safeInteractions = this.interactions.filter(i => !i.isRisky);
      for (const inter of safeInteractions.slice(0, 20)) { // Limit executions
        const result = await this.executeInteraction(inter, this.page);
        this.results.push(result);
      }
    }

    return this.generateResult();
  }

  /**
   * Generate summary result
   */
  generateResult() {
    const pagesVisited = Array.from(this.visited);
    const byType = { NAVIGATE: 0, CLICK: 0, FORM_FILL: 0 };
    const byRisk = { risky: 0, safe: 0 };

    this.interactions.forEach(i => {
      byType[i.type] = (byType[i.type] || 0) + 1;
      if (i.isRisky) byRisk.risky++;
      else byRisk.safe++;
    });

    // Failures and notable successes
    const failures = this.results.filter(r => r.outcome === 'FAILURE').slice(0, 10);
    const successes = this.results.filter(r => r.outcome === 'SUCCESS').slice(0, 5);
    const topResults = [...failures, ...successes];

    return {
      pagesVisited,
      pagesVisitedCount: pagesVisited.length,
      interactionsDiscovered: this.interactions.length,
      interactionsExecuted: this.results.length,
      interactionsByType: byType,
      interactionsByRisk: byRisk,
      interactions: this.interactions,
      results: topResults,
      summary: `Visited ${pagesVisited.length} pages, discovered ${this.interactions.length} interactions ` +
               `(${byRisk.safe} safe, ${byRisk.risky} risky), executed ${this.results.length}`
    };
  }
}

module.exports = { DiscoveryEngine, assessInteractionRisk, classifyInteraction, calculateConfidenceScore };
