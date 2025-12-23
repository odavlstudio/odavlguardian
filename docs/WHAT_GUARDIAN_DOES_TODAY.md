# What ODAVL Guardian Does Today

**Version:** 0.2.0-phase6  
**Last Updated:** December 23, 2025

## Reality Check

This document describes **only what Guardian actually does today**, proven by code and tests.

---

## What Guardian IS

Guardian is a **CLI-based Market Reality Testing Engine** that:

✅ **Opens real websites in Chromium browser** (via Playwright)  
✅ **Executes pre-defined user attempts** (contact forms, language toggle, newsletter signup)  
✅ **Detects user success, failure, or friction** deterministically  
✅ **Validates soft failures** (page loads but user wouldn't succeed)  
✅ **Captures evidence** (screenshots, network traces, console logs)  
✅ **Tracks baseline behavior** and detects regressions  
✅ **Scores market impact** (REVENUE/LEAD/TRUST criticality)  
✅ **Enforces policy gates** for CI/CD (PASS/FAIL based on thresholds)  
✅ **Generates reports** (HTML, JSON, CLI summary)  
✅ **Discovers interactions** via safe exploration (discovery engine)

---

## What Guardian Does NOT Do

❌ **Auto-generate attempts from discovery** (discovery finds interactions but doesn't create attempt definitions)  
❌ **Execute payment flows** (intentionally excluded)  
❌ **Test authentication comprehensively** (login/signup flow definitions exist but not actively tested)  
❌ **Use AI or machine learning** (pure deterministic heuristics by design)  
❌ **Visual regression testing** (no pixel diffing)  
❌ **Multi-browser testing** (Chromium only, though Playwright supports others)  
❌ **Run without configuration** (requires attempt definitions for custom flows)

---

## Core Components

| Module | Purpose |
|--------|---------|
| `bin/guardian.js` | CLI entry point, command router |
| `src/guardian/reality.js` | Orchestrates attempt execution, generates market report |
| `src/guardian/attempt-engine.js` | Executes attempt steps (navigate, click, type, waitFor) |
| `src/guardian/browser.js` | Playwright wrapper (launch, navigate, screenshot) |
| `src/guardian/validators.js` | Soft failure detection (URL checks, element visibility) |
| `src/guardian/baseline-storage.js` | Baseline save/load/compare for regression detection |
| `src/guardian/market-criticality.js` | Risk scoring (0-100 impact, CRITICAL/WARNING/INFO) |
| `src/guardian/policy.js` | CI/CD policy gates (threshold enforcement) |
| `src/guardian/discovery-engine.js` | Safe interaction exploration with risk assessment |
| `src/guardian/enhanced-html-reporter.js` | Interactive HTML report generation |

---

## Commands

### Install Dependencies

```bash
npm install
```

### Run Reality Test (Default Attempts)

```bash
# Against real site
node bin/guardian.js reality --url https://your-site.com

# Against local fixture (for testing)
npm test
```

### Save Baseline

```bash
node bin/guardian.js baseline save --url https://your-site.com --name baseline
```

### Check Against Baseline

```bash
node bin/guardian.js baseline check --url https://your-site.com --name baseline
```

### Run with Policy Gate

```bash
node bin/guardian.js reality --url https://your-site.com --policy preset:startup
# Exit codes: 0=PASS, 1=FAILURE, 2=FRICTION
```

### Initialize Guardian in Project

```bash
node bin/guardian.js init
# Creates guardian.policy.json with startup preset
```

### List Available Presets

```bash
node bin/guardian.js presets
# Shows: startup, saas, enterprise
```

---

## Output Artifacts

After a run, Guardian creates:

```
artifacts/
  market-run-YYYYMMDD-HHMMSS/
    market-report.json          # Full results
    report.html                 # Enhanced interactive report
    snapshot.json               # Structured snapshot
    contact_form/
      attempt-YYYYMMDD-HHMMSS/
        attempt-report.json     # Attempt-specific report
        attempt-report.html     # Attempt-specific HTML
        attempt-screenshots/
          *.jpeg                # Step screenshots
        trace.zip               # Playwright trace (if enabled)
    language_switch/
      ...
    newsletter_signup/
      ...
```

---

## Test Suite

```bash
# Run all tests
npm run test:all

# Run specific phase tests
npm run test:phase6   # Latest features
npm run test:reality  # Reality engine
npm run test:baseline # Baseline system
npm run test:discovery # Discovery engine
```

All tests use a local fixture server (no external dependencies).

---

## Current Attempt Definitions

Guardian ships with 4 default attempts:

1. **contact_form** — Navigate → Fill name/email/message → Submit → Validate success
2. **language_switch** — Click language toggle → Select DE → Verify current language
3. **newsletter_signup** — Fill email → Submit → Validate confirmation
4. **universal_reality** — Basic page load + safe navigation probe

Each attempt has:
- Step sequence (navigate, click, type, waitFor)
- Success conditions (element visibility, URL patterns)
- Validator specs (soft failure detection)
- Risk category (REVENUE, LEAD, TRUST/UX)

---

## Baseline System

**How it works:**

1. **First run:** Execute attempts → Generate snapshot
2. **Save baseline:** `baseline save` → Creates `.odavl-guardian/baselines/baseline.json`
3. **Subsequent runs:** Compare new snapshot to baseline → Detect regressions
4. **Report diffs:** Outcome changes, new friction, duration increases

**Baseline file structure:**

```json
{
  "schemaVersion": 1,
  "guardianVersion": "0.2.0-phase6",
  "baselineName": "baseline",
  "createdAt": "2025-12-23T...",
  "baseUrl": "https://example.com",
  "attempts": ["contact_form", "language_switch", "newsletter_signup"],
  "overallVerdict": "SUCCESS",
  "perAttempt": [...]
}
```

---

## Policy Gates (CI/CD)

Guardian supports three preset policies:

| Preset | Description | Fail Threshold |
|--------|-------------|----------------|
| **startup** | Permissive | CRITICAL only |
| **saas** | Balanced | CRITICAL + regressions |
| **enterprise** | Strict | CRITICAL + WARNING |

**Example CI usage:**

```bash
node bin/guardian.js reality --url $STAGING_URL --policy preset:saas --webhook $SLACK_WEBHOOK
if [ $? -ne 0 ]; then
  echo "Guardian detected issues"
  exit 1
fi
```

---

## Determinism Guarantees

✅ **Same input → Same output** (no randomness)  
✅ **Schema versioning** for backward compatibility  
✅ **Local fixture tests** (no external network dependencies)  
✅ **Reproducible results** across runs  
✅ **Timestamped artifacts** for audit trail

---

## Extending Guardian

### Add Custom Attempt

Edit `src/guardian/attempt-registry.js`:

```javascript
custom_flow: {
  id: 'custom_flow',
  name: 'Custom Flow',
  goal: 'User completes custom flow',
  riskCategory: 'LEAD',
  baseSteps: [
    { id: 'navigate_home', type: 'navigate', target: '$BASEURL', description: 'Go to home' },
    { id: 'click_button', type: 'click', target: 'button.custom', description: 'Click custom button' }
  ],
  validators: [
    { type: 'elementVisible', selector: '.success' }
  ]
}
```

### Run Custom Attempt

```bash
node bin/guardian.js reality --url https://your-site.com --attempts custom_flow
```

---

## Limitations (Current Phase)

- **Pre-configured attempts only** — No auto-generation from discovery yet
- **Chromium browser only** — Firefox/WebKit not configured
- **No payment testing** — Intentionally excluded
- **No visual regression** — No pixel diffing
- **CLI-only** — No cloud service or API server

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS (all attempts succeeded, no critical issues) |
| 1 | FAILURE (at least one attempt failed, or critical policy violation) |
| 2 | FRICTION (all attempts succeeded but with friction signals) |

---

## Evidence

This document is backed by:
- 20+ passing automated tests
- Real browser automation (Playwright)
- Production-quality output artifacts
- Deterministic fixture server for testing

**No marketing claims. Only what the code actually does.**
