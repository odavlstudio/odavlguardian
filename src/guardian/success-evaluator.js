/**
 * Wave 1.3 — Outcome-Based Success Evaluator
 * Deterministic success evaluation for form submissions and key flows.
 * No reliance on specific confirmation text; uses signals: Network, Navigation, DOM, Errors.
 */

const URL_SAFE_STATUSES = new Set([200, 201, 202, 204, 302, 303]);

/**
 * Capture pre-submit state around a submit element's owning form.
 * @param {import('playwright').Page} page
 * @param {import('playwright').ElementHandle|null} submitHandle
 */
async function captureBeforeState(page, submitHandle) {
  const url = page.url();
  const state = await page.evaluate((submitEl) => {
    const result = {
      formSelector: null,
      formExists: false,
      inputsFilledCount: 0,
      inputsTotal: 0,
      ariaInvalidCount: 0,
      hasAlertRegion: false,
      alertTextLength: 0,
      liveRegionTextLength: 0,
    };

    let form = null;
    if (submitEl) {
      form = submitEl.closest('form');
    } else {
      form = document.querySelector('form');
    }

    if (form) {
      result.formSelector = form.getAttribute('id') ? `#${form.id}` : null;
      result.formExists = true;
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
      result.inputsTotal = inputs.length;
      result.inputsFilledCount = inputs.filter((el) => {
        const val = (el.value || '').trim();
        return val.length > 0;
      }).length;
      result.ariaInvalidCount = inputs.filter((el) => el.getAttribute('aria-invalid') === 'true').length;
    }

    // role=alert or [aria-live]
    const alertEl = document.querySelector('[role="alert"], .alert, .error, .invalid');
    if (alertEl) {
      result.hasAlertRegion = true;
      result.alertTextLength = (alertEl.textContent || '').trim().length;
    }
    const liveEl = document.querySelector('[aria-live]');
    if (liveEl) {
      result.liveRegionTextLength = (liveEl.textContent || '').trim().length;
    }
    return result;
  }, submitHandle);

  return { url, state };
}

/**
 * Capture post-submit state.
 * @param {import('playwright').Page} page
 * @param {string|null} originalFormSelector
 */
async function captureAfterState(page, originalFormSelector) {
  const url = page.url();
  const state = await page.evaluate((formSelector) => {
    const result = {
      formExists: false,
      formDisabled: false,
      inputsFilledCount: 0,
      inputsTotal: 0,
      ariaInvalidCount: 0,
      hasAlertRegion: false,
      alertTextLength: 0,
      liveRegionTextLength: 0,
    };

    let form = null;
    if (formSelector) {
      form = document.querySelector(formSelector);
    }
    if (!form) {
      form = document.querySelector('form');
    }

    if (form) {
      result.formExists = true;
      result.formDisabled = !!form.getAttribute('disabled') || (form.classList.contains('disabled'));
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
      result.inputsTotal = inputs.length;
      result.inputsFilledCount = inputs.filter((el) => (el.value || '').trim().length > 0).length;
      result.ariaInvalidCount = inputs.filter((el) => el.getAttribute('aria-invalid') === 'true').length;
    }

    const alertEl = document.querySelector('[role="alert"], .alert, .error, .invalid');
    if (alertEl) {
      result.hasAlertRegion = true;
      result.alertTextLength = (alertEl.textContent || '').trim().length;
    }
    const liveEl = document.querySelector('[aria-live]');
    if (liveEl) {
      result.liveRegionTextLength = (liveEl.textContent || '').trim().length;
    }
    return result;
  }, originalFormSelector);

  return { url, state };
}

/**
 * Evaluate success based on signals.
 * @param {{url:string,state:Object}} before
 * @param {{url:string,state:Object}} after
 * @param {{requests:Array,responses:Array,consoleErrors:Array,navChanged:boolean,baseOrigin:string}} events
 * @returns {{status:'success'|'friction'|'failure',confidence:'high'|'medium'|'low',reasons:string[],evidence:Object}}
 */
function evaluateSuccess(before, after, events) {
  const reasons = [];
  const evidence = {
    network: [],
    urlChanged: before.url !== after.url,
    formCleared: false,
    formDisappeared: false,
    formDisabled: false,
    alertRegionDelta: 0,
    liveRegionDelta: 0,
    ariaInvalidDelta: 0,
    consoleErrors: events.consoleErrors || [],
  };

  // A) Network success
  const baseOrigin = events.baseOrigin;
  let strongNetworkPositive = false;
  for (const r of (events.responses || [])) {
    const req = typeof r.request === 'function' ? r.request() : r.request;
    if (!req || typeof req.url !== 'function') continue;
    const url = req.url();
    const originOk = safeSameOrAllowedOrigin(url, baseOrigin);
    const method = (typeof req.method === 'function' ? req.method() : '').toUpperCase();
    const status = typeof r.status === 'function' ? r.status() : r.status;
    const statusOk = URL_SAFE_STATUSES.has(status);
    evidence.network.push({ method, url, status, originOk, statusOk });
    if (originOk && (method === 'POST' || method === 'PUT') && statusOk) {
      strongNetworkPositive = true;
    }
  }

  if (strongNetworkPositive) {
    reasons.push('Network submit succeeded (safe status and origin)');
  }

  // B) Navigation
  const navPositive = !!events.navChanged;
  if (navPositive) reasons.push('URL changed after submit');

  // C) DOM outcome
  const beforeState = before.state;
  const afterState = after.state;
  evidence.formDisappeared = !!beforeState.formExists && !afterState.formExists;
  evidence.formDisabled = !!afterState.formDisabled;
  evidence.formCleared = beforeState.inputsFilledCount > 0 && afterState.inputsFilledCount < beforeState.inputsFilledCount;
  evidence.alertRegionDelta = (afterState.alertTextLength || 0) - (beforeState.alertTextLength || 0);
  evidence.liveRegionDelta = (afterState.liveRegionTextLength || 0) - (beforeState.liveRegionTextLength || 0);
  evidence.ariaInvalidDelta = (afterState.ariaInvalidCount || 0) - (beforeState.ariaInvalidCount || 0);

  const domPositive = evidence.formDisappeared || evidence.formDisabled || evidence.formCleared || evidence.liveRegionDelta > 0;
  if (domPositive) reasons.push('Form outcome indicates completion (cleared/disabled/disappeared or live region updated)');

  // D) Error outcome
  const strongNegative = evidence.ariaInvalidDelta > 0 || (afterState.hasAlertRegion && evidence.alertRegionDelta > 0);
  if (strongNegative) reasons.push('Error markers increased after submit');

  // E) Console errors
  const consoleNegative = (events.consoleErrors || []).length > 0;
  if (consoleNegative) reasons.push('Console errors after submit');

  // Decision table
  let status = 'failure';
  let confidence = 'low';
  if (strongNetworkPositive && (navPositive || domPositive) && !strongNegative && !consoleNegative) {
    status = 'success';
    confidence = 'high';
  } else if ((strongNetworkPositive || navPositive || domPositive) && (strongNegative || consoleNegative)) {
    status = 'friction';
    confidence = strongNetworkPositive ? 'medium' : 'low';
  } else if (strongNetworkPositive || navPositive || domPositive) {
    status = 'success';
    confidence = 'medium';
  } else {
    status = 'failure';
    confidence = strongNegative ? 'medium' : 'low';
  }

  return { status, confidence, reasons, evidence };
}

function safeSameOrAllowedOrigin(url, baseOrigin) {
  try {
    const u = new URL(url);
    return u.origin === baseOrigin;
  } catch {
    return false;
  }
}

module.exports = {
  captureBeforeState,
  captureAfterState,
  evaluateSuccess,
};
