/**
 * Phase 12.3: Human Failure Intelligence
 * Deterministic heuristics to explain failures like a human.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_DIR = path.join(os.homedir(), '.odavl-guardian', 'failures');
const SIGNATURE_FILE = path.join(STORE_DIR, 'signatures.json');

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadSignatures() {
  ensureStore();
  if (!fs.existsSync(SIGNATURE_FILE)) {
    return { sites: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(SIGNATURE_FILE, 'utf-8'));
  } catch {
    return { sites: {} };
  }
}

function saveSignatures(data) {
  ensureStore();
  fs.writeFileSync(SIGNATURE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

function classifyFailureStage(stepIndex, totalSteps, goalIndex, success) {
  if (success) return 'AFTER_GOAL';
  if (typeof goalIndex !== 'number') goalIndex = totalSteps - 1;
  if (stepIndex < goalIndex) return 'BEFORE_GOAL';
  if (stepIndex === goalIndex) return 'AT_GOAL';
  return 'AFTER_GOAL';
}

function determineCause(step) {
  // Deterministic priority
  // 1) CTA_NOT_FOUND
  // 2) ELEMENT_NOT_FOUND on submit
  // 3) TIMEOUT near navigation
  // 4) INTENT_DRIFT
  const code = step?.errorCode || step?.result?.errorCode || step?.status;
  const tags = step?.tags || step?.result?.tags || [];
  const action = (step?.action || step?.name || '').toLowerCase();

  if (code === 'CTA_NOT_FOUND' || tags.includes('cta')) {
    return { cause: 'Primary action not visible', hint: 'Make the main signup button visible without scrolling.' };
  }

  if ((code === 'ELEMENT_NOT_FOUND' || code === 'MISSING_ELEMENT') && (tags.includes('submit') || action.includes('submit'))) {
    return { cause: 'Form submission blocked', hint: 'Ensure the submit button exists and is enabled.' };
  }

  if (code === 'TIMEOUT' || (tags.includes('nav') && (code === 'SLOW' || code === 'BLOCKED'))) {
    return { cause: 'Slow or blocked navigation', hint: 'Speed up routing or ensure target page loads reliably.' };
  }

  if (code === 'INTENT_DRIFT' || tags.includes('drift')) {
    return { cause: 'Page no longer matches visitor intent', hint: 'Restore intent-aligned content and CTA on the target page.' };
  }

  return { cause: 'Unknown failure', hint: 'Investigate logs and UI for missing elements or errors.' };
}

function analyzeFailure(journeyResult) {
  const totalSteps = (journeyResult.executedSteps?.length || 0) + (journeyResult.failedSteps?.length || 0);
  const steps = journeyResult.executedSteps || [];
  const failed = journeyResult.failedSteps || [];

  let failureStepId = null;
  let failureStepIdx = -1;
  let failureStep = null;

  if (failed.length > 0) {
    // failedSteps may be an array of IDs; locate the first failing step
    const firstFailId = typeof failed[0] === 'string' ? failed[0] : failed[0]?.id || failed[0];
    failureStepId = firstFailId;
    failureStepIdx = steps.findIndex(s => s.id === firstFailId);
    if (failureStepIdx === -1 && typeof firstFailId === 'number') {
      failureStepIdx = firstFailId;
    }
  } else {
    // Otherwise, look for error status in executed steps
    failureStepIdx = steps.findIndex(s => s.status === 'error' || s.status === 'timeout' || s.result?.status === 'error');
    if (failureStepIdx !== -1) failureStepId = steps[failureStepIdx].id;
  }

  if (failureStepIdx === -1) {
    // No explicit failure found; classify after goal if success, else before goal as default
    const stage = classifyFailureStage(totalSteps - 1, totalSteps, totalSteps - 1, journeyResult.goal?.goalReached === true || journeyResult.success === true);
    const causeInfo = { cause: 'Unknown failure', hint: 'Investigate logs and UI for missing elements or errors.' };
    return {
      failureStepId: failureStepId,
      failureStage: stage,
      cause: causeInfo.cause,
      hint: causeInfo.hint,
    };
  }

  failureStep = steps[failureStepIdx] || null;
  const goalReached = journeyResult.goal?.goalReached === true || journeyResult.success === true;
  let stage = 'AFTER_GOAL';
  if (!goalReached) {
    // Default to BEFORE_GOAL when goal not reached unless explicitly marked as goal step
    const goalStepId = journeyResult.goal?.goalStepId;
    if (goalStepId && (failureStep?.id === goalStepId || failureStepIdx === goalStepId)) {
      stage = 'AT_GOAL';
    } else {
      stage = 'BEFORE_GOAL';
    }
  }
  const causeInfo = determineCause(failureStep);

  return {
    failureStepId: failureStep?.id || failureStepIdx,
    failureStage: stage,
    cause: causeInfo.cause,
    hint: causeInfo.hint,
  };
}

function buildSignature(info) {
  return `${info.failureStage}|${info.cause}|${info.failureStepId ?? 'unknown'}`;
}

function recordSignature(siteUrl, info) {
  const data = loadSignatures();
  const domain = getDomain(siteUrl);
  if (!data.sites[domain]) data.sites[domain] = { signatures: {} };
  const sig = buildSignature(info);
  const entry = data.sites[domain].signatures[sig] || { count: 0, lastSeen: null };
  entry.count += 1;
  entry.lastSeen = new Date().toISOString();
  data.sites[domain].signatures[sig] = entry;
  saveSignatures(data);
  return { signature: sig, count: entry.count };
}

function getSignatureCount(siteUrl, info) {
  const data = loadSignatures();
  const domain = getDomain(siteUrl);
  const sig = buildSignature(info);
  return data.sites[domain]?.signatures?.[sig]?.count || 0;
}

module.exports = {
  analyzeFailure,
  determineCause,
  classifyFailureStage,
  recordSignature,
  getSignatureCount,
  buildSignature,
  loadSignatures,
  saveSignatures,
};
