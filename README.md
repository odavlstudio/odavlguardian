# 🛡️ ODAVL Guardian — Market Reality Testing Engine

**Nothing is real until the market can use it.**

Guardian tests your product **before the market does** — by simulating real user behavior in a real browser.

---

## ⚡ Quick Start — One Command

```bash
# Scan your site with Guardian
guardian scan https://your-site.com

# Or use a preset for your use case:
guardian scan https://your-site.com --preset landing
guardian scan https://your-site.com --preset saas
guardian scan https://your-site.com --preset shop
```

That's it! Guardian will:
- ✅ Discover pages and interactions automatically
- ✅ Execute critical user flows (signup, login, checkout)
- ✅ Detect regressions against baseline
- ✅ Generate comprehensive HTML report with evidence
- ✅ Provide actionable next steps

**First run?** Guardian creates a baseline. Subsequent runs detect regressions.

---

## 📋 Presets

Guardian ships with three presets optimized for different use cases:

| Preset | Attempts | Flows | Visual Gates | Use Case |
|--------|----------|-------|--------------|----------|
| **landing** | Contact + Newsletter + Language toggle | Signup + Login | Off | Landing pages, marketing sites |
| **saas** | Contact + Newsletter + Language toggle | Signup + Login | Off | SaaS apps, dashboards |
| **shop** | Contact + Newsletter + Language toggle | Checkout | Off | E-commerce, shopping carts |

All presets include:
- Auto-generated attempts from discovery
- Baseline comparison for regression detection
- Market criticality scoring
- Intelligence-driven failure analysis

---

## ✨ What's New (v0.1.0-rc1)

🆕 **One-Command Scan** — `guardian scan <url>` runs full pipeline with presets
🆕 **Preset Policies** — Landing, SaaS, Shop presets ready to use
🆕 **Enhanced CLI Summary** — Human-friendly output with top 3 issues and next actions
🆕 **Interactive HTML Report** — Top risks, discovery results, diff view, evidence gallery
🆕 **Visual & Behavioral Reality** — Deterministic visual diff engine + behavioral signal detection
✅ **Phase 5 Features** — CI/CD integration with policy gates and webhooks
✅ **Phase 4 Features** — Discovery engine with auto-interaction
✅ **Phase 3 Features** — Market criticality scoring with severity escalation
✅ **Phase 2 Features** — Soft failure detection with validators
✅ **Phase 1 Core** — Market reality testing with crawl & attempts
✅ **All Tests Pass** — Phase 6 productization locked, 100% backward compatible

---

## 🎯 Phases Overview

| Phase | Feature | Status |
|-------|---------|--------|
| **1** | Market Reality Testing | ✅ Complete |
| **2** | Screenshots, HTML Reports, Safety | ✅ Complete |
| **3** | Market Criticality Scoring | ✅ Complete |
| **4** | **Breakage Intelligence** | **✅ Complete** |
| **5** | CI/CD Policy & Webhooks | ✅ Complete |
| **6** | **Experience & Adoption** | **🆕 Live!** |

---

## Phase 4: Breakage Intelligence ✅

**Goal:** Transform failures into **actionable intelligence** that answers: What broke? Why it matters? What to check first?

### Features

✅ **Failure Taxonomy** — Deterministic classification by type (NAVIGATION, SUBMISSION, VALIDATION, TIMEOUT, VISUAL, CONSOLE, NETWORK)
✅ **Impact Domain Mapping** — Failures tagged as REVENUE, LEAD, TRUST, or UX
✅ **Severity Scoring** — Formula-based (not AI guessing): baseScore + flowBonus + typeBonus = CRITICAL/WARNING/INFO
✅ **Root Cause Hints** — Extracted from failed steps, validators, and friction signals
✅ **Actionable Summaries** — "Why It Matters" bullets + "Top 3 Actions" per failure
✅ **Domain-Aware Policy Gates** — Fail CI/CD on CRITICAL failures in REVENUE/TRUST domains
✅ **Intelligence in Reports** — Market report includes full taxonomy + hints + actions

### Example

When checkout fails with "Form submission validation failed":

```
🟡 checkout (SUBMISSION, REVENUE, WARNING)
   Why it matters:
     • Checkout submission blocked; customers cannot complete purchases
   Top Actions:
     1. Check payment form validator logs for validation errors
     2. Verify payment gateway integration is online
     3. Review form requirements match provider specifications
```

### Implementation Files

- [src/guardian/failure-taxonomy.js](src/guardian/failure-taxonomy.js) — Break type/domain/severity classification
- [src/guardian/root-cause-analysis.js](src/guardian/root-cause-analysis.js) — Root cause hint extraction
- [src/guardian/breakage-intelligence.js](src/guardian/breakage-intelligence.js) — Intelligence aggregation
- [PHASE4_COMPLETION.md](PHASE4_COMPLETION.md) — Full Phase 4 documentation

### Test Results

✅ **25 unit tests** (taxonomy, hints, intelligence, policy gates, scoring)
✅ **4 evidence tests** (end-to-end integration)
✅ **29/29 tests passing**

---

## Phase 6: Guardian Experience & Adoption

**Goal:** Make Guardian effortless to adopt and delightful to use.

### New Features

#### 1. One-Command Onboarding

```bash
# Initialize Guardian
guardian init

# Creates:
# - guardian.policy.json (startup preset)
# - .gitignore entries
# - Prints next steps
```

#### 2. Protect Shortcut

```bash
# Quick reality check with startup policy
guardian protect https://your-site.com

# Equivalent to:
# guardian reality --url https://your-site.com --policy preset:startup
```

#### 3. Preset Policies

Three ready-to-use policies:

| Preset | Description | Use Case |
|--------|-------------|----------|
| **startup** | Permissive (fail on CRITICAL only) | Fast-moving startups |
| **saas** | Balanced (fail on CRITICAL + detect regressions) | SaaS products |
| **enterprise** | Strict (zero tolerance for CRITICAL/WARNING) | Enterprise deployments |

```bash
# Use preset directly
guardian reality --url https://example.com --policy preset:saas

# List all presets
guardian presets
```

#### 4. Enhanced CLI Summary

Guardian now prints a human-friendly summary at the end of each run:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️  Guardian Reality Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: https://example.com
Run ID: market-run-20251223-150030

📊 Risk Summary:
  🚨 CRITICAL: 1 (Revenue impact)
  ⚠️  WARNING:  2 (User experience)
  ℹ️  INFO:     0

🔥 Top Risk:
   Checkout button no longer leads to payment page
   Impact: 95 (REVENUE)
   Severity: CRITICAL
   Evidence: artifacts/market-run-*/checkout_flow/checkout.png

🎯 Attempts:
   2/3 successful (1 failed)

🔍 Discovery:
   Pages visited: 15
   Interactions discovered: 42
   Interactions executed: 38

👉 Next Action:
   ⚠️  Fix the CRITICAL issue before deploying.
   Review the top risk above and check evidence screenshots.

📁 Full report: artifacts/market-run-20251223-150030/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 5. Interactive HTML Report

The enhanced HTML report includes:
- **📊 Summary Cards** — Visual overview of risks and attempts
- **🔥 Top Risks** — Sorted by severity and impact
- **🎯 Attempts** — All executed attempts with outcomes
- **🔍 Discovery** — Pages visited and interactions discovered
- **📊 Changes Since Last Run** — Regressions and improvements
- **📸 Evidence Gallery** — Clickable screenshots grouped by risk

The report is:
- ✅ Vanilla HTML + CSS + minimal JS (no frameworks)
- ✅ Works offline (no external dependencies)
- ✅ Fully responsive and mobile-friendly

---

## Phase 5: Continuous Guard Mode (CI/CD Integration)

**Goal:** Enable automated policy-based testing gates and CI/CD integration.

Guardian now supports:
- **🔒 Policy-Based Gating** — Deterministic thresholds for CI/CD success/failure
- **📋 JUnit XML Reporting** — Jenkins, GitLab, GitHub Actions compatible
- **🔔 Webhook Notifications** — Send results to external systems for logging/dashboards
- **⚙️ GitHub Actions Workflow** — Pre-built `.github/workflows/guardian.yml`

### Quick Start: CI/CD Integration

```bash
# 1. Create policy file
cat > guardian.policy.json << 'EOF'
{
  "failOnSeverity": "CRITICAL",
  "maxWarnings": 0,
  "failOnNewRegression": true
}
EOF

# 2. Run Guardian with policy evaluation
npm start -- --url https://example.com

# 3. Check exit code
echo $?  # 0=pass, 1=fail(critical), 2=warn(warning threshold)

# 4. Generate JUnit report
npm start -- --url https://example.com --junit artifacts/junit.xml

# 5. Send webhook notification
export GUARDIAN_WEBHOOK_URL=https://hooks.example.com
npm start -- --url https://example.com --webhook $GUARDIAN_WEBHOOK_URL
```

### Policy Configuration

```json
{
  "failOnSeverity": "CRITICAL",      // CRITICAL | WARNING | INFO
  "maxWarnings": 0,                   // Max WARNING count allowed
  "maxInfo": 999,                     // Max INFO count allowed
  "maxTotalRisk": 999,                // Max total risks allowed
  "failOnNewRegression": true,        // Fail if baseline regresses
  "failOnSoftFailures": false,        // Fail on soft failures
  "softFailureThreshold": 5,          // Max soft failures before fail
  "requireBaseline": false            // Require baseline to exist
}
```

### Exit Codes

```
0 = ✅ All checks passed (build succeeds)
1 = ❌ Hard fail - CRITICAL or regression (build fails)
2 = ⚠️  Soft fail - WARNING threshold (build may warn)
```

### GitHub Actions Integration

```yaml
name: Guardian CI
on: [push, pull_request]

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - run: npm ci
      - run: npm start -- \
          --url https://example.com \
          --junit artifacts/junit.xml \
          --webhook ${{ secrets.GUARDIAN_WEBHOOK_URL }}
      
      - uses: actions/upload-artifact@v4
        with:
          name: guardian-reports
          path: artifacts/
```

### Webhook Notifications

Send test results to external systems:

```bash
# Single webhook
export GUARDIAN_WEBHOOK_URL=https://hooks.example.com

# Multiple webhooks (comma-separated)
export GUARDIAN_WEBHOOK_URL="https://a.com, https://b.com"

# Webhook payload includes:
# - Risk counts (CRITICAL, WARNING, INFO)
# - Top 3 risks with business impact
# - Attempt success rates
# - Discovery stats
# - Artifact paths (JUnit, reports, screenshots)
# - Policy evaluation reasons
```

### Test the Phase 5 Implementation

```bash
# Run all 25 Phase 5 tests (policy, JUnit, webhooks)
npm run test:phase5

# Run all phases together
npm run test:all
```

**Test Results:**
✅ 25/25 Phase 5 tests PASS
✅ Policy evaluation: 7 tests
✅ JUnit XML: 9 tests  
✅ Webhooks: 7 tests
✅ Integration: 2 tests

**Backward Compatibility:** 100% — All phases 1-4 work unchanged

---

## Phase 4: Discovery Engine (Auto-Interactions)

**Goal:** Make ODAVL Guardian proactively explore your site like a real user would.

Instead of only executing predefined attempts, Guardian now:
1. **Crawls** your site (up to 25 pages by default)
2. **Harvests** all clickable elements: links, buttons, forms
3. **Filters** by safety (denies risky buttons like logout, delete, checkout)
4. **Explores** safe interactions and captures outcomes

### Discovery Process

```
1. Start from baseUrl
2. Extract candidates:
   - Links (<a href>) same-origin only
   - Buttons (<button>, [role="button"], input[type=submit]) visible only
   - Forms (detect input fields: email, text, password)
3. Assess risk for each:
   - Deny risky text: "logout", "delete", "remove", "checkout", "payment"
   - Deny risky hrefs: /logout, /delete, /checkout, /admin, etc
   - Deny if disabled or invisible
   - Allow safe links by default
   - Allow safe forms if marked data-guardian-safe="true" or known safe (newsletter, contact)
4. Execute safe interactions:
   - NAVIGATE: Follow links
   - CLICK: Activate buttons, capture DOM changes
   - FORM_FILL: Fill email/text/password fields (no submit unless safe form)
5. Capture outcomes:
   - SUCCESS: Navigation occurred / button worked / form filled
   - FAILURE: Exception thrown, element not found
   - FRICTION: Took longer than threshold
```

### Safety Model (Non-Negotiable)

The safety model prevents dangerous auto-interactions:

| Rule | Type | Examples | Action |
| --- | --- | --- | --- |
| **Risky Text** | CLICK buttons | logout, delete, remove, unsubscribe, checkout, payment | DENY |
| **Risky Href** | NAVIGATE links | /logout, /delete, /checkout, /admin | DENY |
| **Disabled/Invisible** | Any | Hidden elements | DENY |
| **Safe Links** | NAVIGATE | /products, /about, /pricing | ALLOW |
| **Safe Forms** | FORM_FILL | data-guardian-safe="true" OR newsletter, contact | ALLOW |
| **Unknown Forms** | FORM_FILL | Arbitrary forms without safe flag | DENY |

**Key Rule:** Discovery never submits forms unless they are explicitly marked safe.

### Configuration

```json
{
  "discovery": {
    "enabled": true,
    "maxPages": 25,
    "maxInteractionsPerPage": 10,
    "executeInteractions": false,
    "timeout": 20000
  }
}
```

### Example Output

```
🔍 Discovery Run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pages Visited:
  • https://example.com/
  • https://example.com/products
  • https://example.com/pricing
  • https://example.com/about
  (4 pages visited)

Interactions Discovered: 28
  • NAVIGATE: 8 (safe links)
  • CLICK: 12 (safe buttons)
  • FORM_FILL: 3 (newsletter, contact, search)
  • RISKY: 5 (logout, delete, checkout, payment, account)

Interactions Executed: 15
  ✓ nav-0: Navigate /products — SUCCESS (345ms)
  ✓ nav-1: Navigate /pricing — SUCCESS (401ms)
  ✓ click-2: Safe button — SUCCESS (156ms)
  ✓ form-0: Newsletter signup — SUCCESS (245ms, filled 2 fields)
  ✗ click-5: Navigation button — FAILURE (Element not found)
  ... (10 more)

Safety Verdict:
  ✓ 5 risky interactions blocked (logout, delete, etc)
  ✓ 23 safe interactions discovered
  ✓ No dangerous form submissions
  ✓ Safe exploration complete
```

### Snapshot Integration

Each discovery run adds a `discovery` section to the snapshot:

```json
{
  "discovery": {
    "pagesVisited": [
      "https://example.com/",
      "https://example.com/products",
      "https://example.com/pricing"
    ],
    "pagesVisitedCount": 3,
    "interactionsDiscovered": 28,
    "interactionsExecuted": 15,
    "interactionsByType": {
      "NAVIGATE": 8,
      "CLICK": 12,
      "FORM_FILL": 3
    },
    "interactionsByRisk": {
      "safe": 23,
      "risky": 5
    },
    "results": [
      {
        "interactionId": "nav-0",
        "pageUrl": "https://example.com/",
        "type": "NAVIGATE",
        "selector": "a[href=\"/products\"]",
        "outcome": "SUCCESS",
        "notes": "Navigated to /products",
        "durationMs": 345,
        "targetUrl": "https://example.com/products"
      },
      ...
    ],
    "summary": "Visited 3 pages, discovered 28 interactions (23 safe, 5 risky), executed 15"
  }
}
```

### Baseline Comparison

Discovery results are compared against baseline to detect:
- **Interactions Disappeared** — Link removed, button hidden
- **Behavior Changed** — Previously successful interaction now fails
- **New Risky Interactions** — Dangerous button added to page
- **Interaction Timing Degraded** — Form now takes too long to submit

Example diff:
```
Interaction Changes:
  ✓ nav-products: SUCCESS → SUCCESS (no change)
  ✗ click-checkout: SUCCESS → FAILURE (NEW FAILURE!)
  • click-delete: Marked RISKY → Still RISKY (consistent safety)
```

### Integration with Market Criticality

Discovery failures on high-value pages are scored higher:
- Failure on `/checkout` → CRITICAL (Revenue impact)
- Failure on `/pricing` → WARNING (Lead gen impact)
- Failure on `/about` → INFO (General UX)

---

## Phase 3: Market Criticality

**Goal:** Understand WHICH failures matter most to the business.

Guardian scores failures by market impact:
- **Revenue** — Checkout, payment, purchase attempts (highest weight)
- **Lead** — Contact forms, newsletter signup, demo requests
- **Trust/UX** — Authentication, language toggle, account settings
- **UX** — General usability issues (lowest weight)

### Severity Levels

| Severity | Score | Business Impact |
| --- | --- | --- |
| **CRITICAL** | 71-100 | Direct revenue loss |
| **WARNING** | 31-70 | Trust/experience degradation |
| **INFO** | 0-30 | Minor UX issues |
      * frequency_multiplier
```

**Base category weights:**
- Revenue: 80
- Lead: 60
- Trust: 50
- UX: 30

**Validator outcome:**
- FAIL: +15 points
- WARN: +8 points

**URL context boost:**
- On checkout page + Revenue risk: +10
- On signup page + Lead risk: +8
- On auth page + Trust risk: +8

**Frequency multiplier:**
- If risk appears in 3+ runs: multiplied by 1.3x (capped at 100)

### Example Scoring

```javascript
// Scenario: Contact form fails on signup page
score = 60 (Lead)
      + 15 (FAIL validator)
      + 8 (signup page context)
      = 83 → CRITICAL

// Scenario: Language toggle warns on home page
score = 30 (UX)
      + 8 (WARN)
      + 0 (home page has no context boost)
      = 38 → WARNING
```

### Snapshot Structure (Phase 3)

Snapshots now include `marketImpactSummary`:

```json
{
  "schemaVersion": "v1",
  "meta": {...},
  "attempts": [...],
  "signals": [...],
  "marketImpactSummary": {
    "highestSeverity": "CRITICAL",
    "totalRiskCount": 3,
    "countsBySeverity": {
      "CRITICAL": 1,
      "WARNING": 2,
      "INFO": 0
    },
    "topRisks": [
      {
        "attemptId": "checkout",
        "validatorId": "element_visible",
        "category": "REVENUE",
        "severity": "CRITICAL",
        "impactScore": 95,
        "humanReadableReason": "💰 Revenue: checkout - Success button not visible"
      },
      {
        "attemptId": "contact_form",
        "validatorId": "element_not_visible",
        "category": "LEAD",
        "severity": "WARNING",
        "impactScore": 68,
        "humanReadableReason": "👥 Lead Gen: contact_form - Success confirmation missing"
      }
    ]
  },
  "evidence": {...},
  "baseline": {...}
}
```

### CLI Output (Phase 3)

```bash
$ guardian reality --url https://example.com

[...standard output...]

🎯 Market Criticality Summary:
  🚨 1 CRITICAL risk(s) - Revenue/Lead impact
  ⚠️  2 WARNING risk(s) - UX/Trust impact

  Top Risks:
    1. 🚨 [REVENUE] checkout - Success button not visible
    2. ⚠️  [LEAD] contact_form - Confirmation text missing
    3. ⚠️  [TRUST] language_switch - HTML lang attribute not updated
```

### Exit Codes (Phase 3)

Market criticality affects exit codes:

```
0 = SUCCESS (no critical risks OR severity not escalated)
1 = FAILURE (new CRITICAL risk OR severity escalated)
2 = FRICTION (WARNING risks present OR drift detected)
```

**Severity escalation** (between baseline and current run):
- INFO → WARNING = triggers exit code 1
- WARNING → CRITICAL = triggers exit code 1
- No escalation = normal baseline comparison

---

## Quick Start

### Install
```bash
npm install
```

### First Run (Baseline Auto-Created)
```bash
npx guardian reality --url https://example.com
```

Output:
- `artifacts/snapshot-**/snapshot.json` — Market Reality Snapshot v1
- `artifacts/snapshot-**/market-report.html` — Visual report
- `.odavl-guardian/baselines/...` — Baseline auto-saved

### Second Run (Compared Against Baseline)
```bash
npx guardian reality --url https://example.com
```

Exit codes:
- `0` — No regressions (success)
- `1` — FAILURE (regression detected)
- `2` — FRICTION (drift without critical failure)

### Test
```bash
npm test                 # Run all tests
npm run test:snapshot   # Run snapshot tests only
```

---

## Market Reality Snapshot v1

Guardian now produces a **structured snapshot** after each run:

```json
{
  "schemaVersion": "v1",
  "meta": {
    "createdAt": "2025-12-23T...",
    "url": "https://example.com",
    "runId": "snapshot-20251223-..."
  },
  "crawl": {
    "discoveredUrls": [...],
    "visitedCount": 12,
    "failedCount": 0
  },
  "attempts": [
    {
      "attemptId": "contact_form",
      "outcome": "SUCCESS|FAILURE|FRICTION",
      "durationMs": 1234,
      "friction": {...}
    }
  ],
  "signals": [...],
  "evidence": {
    "artifactDir": "artifacts/snapshot-...",
    "marketReportJson": "market-report.json",
    "attemptArtifacts": {...}
  },
  "baseline": {
    "baselineCreatedThisRun": true,
    "baselineFound": false
  }
}
```

**Key features:**
- **schemaVersion** — Always `v1` for compatibility
- **crawl** — URLs discovered during crawl
- **attempts** — All user attempt results
- **signals** — Friction signals and failure reasons
- **evidence** — Paths to screenshots, traces, reports
- **baseline** — Baseline status and drift comparison

---

## CLI Usage

### Reality Mode (Market Reality Snapshot v1)
---

## CLI Usage

### Reality Mode (Market Reality Snapshot v1)

```bash
guardian reality --url <url> [options]

Options:
  --url <url>              Target URL (required)
  --attempts <id1,id2>     Comma-separated attempt IDs (default: contact_form, language_switch, newsletter_signup)
  --artifacts <dir>        Artifacts directory (default: ./artifacts)
  --headful                Run headed browser (default: headless)
  --no-trace               Disable trace recording
  --no-screenshots         Disable screenshots
  --help                   Show help

Exit Codes:
  0 — SUCCESS (first run: baseline created; subsequent: no regressions)
  1 — FAILURE (regression detected)
  2 — FRICTION (drift without critical failure)
```

**What it does:**
- Crawls your site to discover URLs
- Executes curated user attempts (contact form, language toggle, etc.)
- Captures evidence: screenshots, traces, reports
- Auto-creates baseline on first run
- Compares subsequent runs against baseline
- Detects regressions and friction

**Example (First Run):**
```bash
$ guardian reality --url https://example.com

🧪 Market Reality Snapshot v1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Base URL: https://example.com
🎯 Attempts: contact_form, language_switch, newsletter_signup

🔍 Crawling for discovered URLs...
✅ Crawl complete: discovered 15, visited 12

🎬 Executing attempts...
  • Contact Form Submission...
  • Language Toggle...
  • Newsletter Signup...

📊 Baseline check...
💾 Baseline not found - creating auto-baseline...
✅ Baseline created

💾 Saving snapshot...
✅ Snapshot saved: snapshot.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 Artifacts:
  • Market Report: artifacts/snapshot-20251223-.../market-report.json
  • Snapshot: artifacts/snapshot-20251223-.../snapshot.json
  • Baseline: Auto-created (first run)

Exit code: 0 ✅
```

**Example (Second Run — Regression Detected):**
```bash
$ guardian reality --url https://example.com

[...output...]

📊 Baseline check...
✅ Baseline found
⚠️  Regressions detected: contact_form

[...]

❌ Regressions detected

Exit code: 1 ❌
```

### Attempt Mode (Single User Attempt Testing)

| Coverage % | Level | Default Decision |
| --- | --- | --- |
| ≥85% | HIGH | READY |
| 60-85% | MEDIUM | READY (if no errors) |
| 30-60% | LOW | INSUFFICIENT_CONFIDENCE |
| <30% | INSUFFICIENT | DO_NOT_LAUNCH |

---

## Example Output

```
🛡️  ODAVL Guardian — Market Reality Testing Engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Target: https://example.com
⚙️  Config: max-pages=25, max-depth=3, timeout=20000ms

🚀 Launching browser...
✅ Browser launched

🔍 Starting crawl...
✅ Crawl complete: visited 12/15 pages

📊 Generating report...
✅ Report saved to: ./artifacts/run-20251221-123456

🟢 READY — Safe to launch

📈 Coverage: 80%
📄 Pages visited: 12
❌ Failed pages: 0
💬 Confidence: HIGH

📋 Reasons:
   • Coverage is 80%
   • All visited pages loaded successfully

💾 Full report: ./artifacts/run-20251221-123456/report.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Report Format

Guardian generates `report.json`:

```json
{
  "version": "mvp-0.1",
  "timestamp": "2025-12-21T12:34:56.789Z",
  "baseUrl": "https://example.com",
  "summary": {
    "visitedPages": 12,
    "discoveredPages": 15,
    "coverage": 80,
    "failedPages": 0
  },
  "confidence": {
    "level": "HIGH",
    "reasoning": "Coverage is 80% with 0 failed pages"
  },
  "finalJudgment": {
    "decision": "READY",
    "reasons": [
      "Coverage is 80%",
      "All visited pages loaded successfully"
    ]
  },
  "pages": [
    { "index": 1, "url": "https://example.com/", "status": 200, "links": 5 },
    { "index": 2, "url": "https://example.com/about", "status": 200, "links": 3 }
  ]
}
```

---

## Phase 2: Soft Failure Detection (NEW)

**Problem:** Playwright only detects hard failures (exceptions). Silent failures go undetected:
- Form submits but no success indicator → user doesn't know if it worked
- Language switch clicked but page doesn't change → no feedback to user
- Checkout button appears but doesn't navigate → cart is gone

**Solution:** Validators — Pure deterministic checks that run after each attempt:

### Validator Types

| Validator | Use Case | Example |
|-----------|----------|---------|
| `elementVisible` | Check success indicator appeared | Success toast, confirmation message |
| `elementNotVisible` | Check error didn't appear | No error dialog, no failure banner |
| `elementContainsText` | Verify text content | "Thank you", "Confirmed", "Subscribed" |
| `pageContainsAnyText` | Look for any known success keywords | ["success", "confirmed", "thank you"] |
| `urlIncludes` | URL changed as expected | URL contains "/success" or "/checkout" |
| `htmlLangAttribute` | Page language changed | `<html lang="de">` after switching to German |
| `noConsoleErrorsAbove` | No critical console errors | No `error` or `exception` messages |

### Example: Custom Validators

All 3 default attempts include validators:

**Contact Form:**
```javascript
validators: [
  { type: 'elementVisible', selector: '[data-guardian="success"]' },
  { type: 'pageContainsAnyText', textList: ['success', 'submitted', 'thank you'] },
  { type: 'elementNotVisible', selector: '.error, [role="alert"]' }
]
```

**Language Switch:**
```javascript
validators: [
  { type: 'htmlLangAttribute', lang: 'de' },
  { type: 'pageContainsAnyText', textList: ['Deutsch', 'German'] }
]
```

**Newsletter Signup:**
```javascript
validators: [
  { type: 'elementVisible', selector: '[data-guardian="signup-success"]' },
  { type: 'pageContainsAnyText', textList: ['confirmed', 'subscribed'] },
  { type: 'elementNotVisible', selector: '.error' }
]
```

### Soft Failure Outcomes

Snapshot includes validator results:
```json
{
  "attempts": [
    {
      "attemptId": "contact_form",
      "outcome": "SUCCESS",
      "validators": [
        { "id": "element_visible_...", "type": "elementVisible", "status": "PASS", "message": "..." },
        { "id": "page_contains_...", "type": "pageContainsAnyText", "status": "FAIL", "message": "Page does not contain: success, submitted, thank you" }
      ],
      "softFailureCount": 1,
      "riskCategory": "LEAD"
    }
  ],
  "riskSummary": {
    "totalSoftFailures": 1,
    "failuresByCategory": { "LEAD": { "failures": 0, "softFailures": 1 } },
    "topRisks": [
      { "category": "LEAD", "severity": "MEDIUM", "softFailures": 1 }
    ]
  }
}
```

### Risk Categories

Soft failures are scored by business impact:

- **LEAD** — Form, signup, newsletter → user contact lost
- **REVENUE** — Checkout, payment → money lost
- **TRUST/UX** — Language, theme, preferences → user trust eroded

### Testing Soft Failures

```bash
npm run test:soft-failures
```

Tests prove:
- Validators execute and record results
- Soft failures detected even when Playwright doesn't throw
- Baseline comparison includes validator changes
- Risk scoring categorizes by business impact

---

## Project Structure

```
src/guardian/
├── index.js              Main engine (runGuardian)
├── browser.js            Playwright browser wrapper
├── crawler.js            URL discovery & crawling
├── reporter.js           Report generation
├── validators.js         PHASE 2: Soft failure detection
├── attempt-engine.js     Executes user attempts + validators
├── attempt-registry.js   Attempt definitions with validators

bin/
├── guardian.js          CLI entry point

test/
├── mvp.test.js         MVP test suite
├── snapshot.test.js    Snapshot + baseline tests
├── soft-failures.test.js PHASE 2: Soft failure tests

artifacts/
├── run-YYYYMMDD-HHMMSS/
    ├── snapshot.json    Market Reality Snapshot v1
    ├── market-report.html
    └── ...
```

---

## Code Quality

- ✅ **Clean & Simple** — ~1600 lines (Phase 2), easy to understand
- ✅ **Well Documented** — Comments on complex logic
- ✅ **Testable** — Full test coverage
- ✅ **Maintainable** — Clear separation of concerns

---

## Next Features (Roadmap)

- [ ] Flow execution (user interactions)
- [ ] HTML report generation
- [ ] Sitemap discovery
- [ ] Safety guards (prevent destructive actions)
- [ ] Network tracing (HAR)
- [ ] Browser trace collection
- [ ] Custom configuration files
- [ ] Multi-flow support

---

## Philosophy

> **A product is only "real" when it survives a series of market-like reality tests.**

Guardian refuses to:
- ❌ Overstate confidence
- ❌ Ignore broken flows
- ❌ Pretend partial evidence is sufficient

Guardian exists to:
- ✅ Prevent silent revenue loss
- ✅ Detect issues before launch
- ✅ Provide evidence-backed verdicts
- ✅ Give teams genuine peace of mind

---

## License

ODAVL Guardian is proprietary software. Unauthorized copying or distribution is prohibited.

**ODAVL Guardian** is a market reality testing engine that simulates authentic user behavior and performs the exact checks the market would perform on your product — **before any real user ever reaches it**.

Guardian does not test code. Guardian does not care if the build passed. Guardian does not trust that "everything looks fine."

Guardian tests the only truth that matters:

> **Will real users actually succeed?**

---

## The Core Challenge

Today, most software products are:

- ✅ Built correctly
- ✅ Technically tested  
- ✅ Deployed with confidence

Yet they fail at their very first encounter with the market.

Not because of code quality — but because of **small human details**:

- A button doesn't work
- A page doesn't load
- A language toggle doesn't switch
- A form doesn't submit
- A critical flow breaks halfway
- The payment journey feels confusing

📌 Users don't report these problems  
📌 Users don't wait for fixes  
📌 Users simply leave

**ODAVL Guardian exists to prevent this loss before it happens.**

---

## What Guardian Actually Does

Guardian **simulates the market—not the code**.

It behaves exactly like a real user would:

- Opens your website in a real browser
- Navigates between pages naturally
- Clicks buttons, fills forms, switches languages
- Follows links and redirects
- Tests signup and login flows
- Simulates payment journeys
- Visits expected and unexpected URLs
- Repeats scenarios under different conditions
- Captures evidence of every interaction

**As if dozens of real users tested your product—but without losing a single one.**

---

## How Guardian Differs from Traditional Testing Tools

| Traditional Tools | ODAVL Guardian |
| --- | --- | --- |
| Test what *you* think matters | Tests what the *market* cares about |
| Manually written test cases | Intelligent auto-discovery |
| Focus on code correctness | Focus on user success |
| Fail silently in production | Warn before disaster |
| Run after deployment | Run before launch |
| Answer: "Does this work?" | Answer: "Will users succeed?" |

---

## Guardian's Three-Tier Verdict System

Guardian issues only three decisions—each backed by evidence:

### 🟢 **READY**
The product is safe to launch. Evidence is complete and strong.
- Market-realistic flow passed
- Coverage confidence is high
- All critical evidence is present

### 🔴 **DO_NOT_LAUNCH**
Reality is broken. Guardian found a critical blocker.
- A core user flow failed
- Missing critical evidence
- Revenue-critical path is blocked

### 🟡 **INSUFFICIENT_CONFIDENCE**
Guardian cannot confidently recommend launch.
- Coverage is too low (<60%)
- Evidence is partial or incomplete
- Guardian needs more data

**Guardian refuses to overstate certainty. No gray areas.**

---

## What Guardian Tests (in Real Browsers)

✅ **Page Load & Navigation**
- Does the homepage load?
- Can users find and click links?
- Do pages load within acceptable time?

✅ **User Flows**
- Can users complete signup?
- Can users log in?
- Can users navigate through checkout?

✅ **Content & Language**
- Is all critical content visible?
- Do language toggles work?
- Are redirects working correctly?

✅ **Forms & Interactions**
- Do forms accept input?
- Do form validations work?
- Can users submit successfully?

✅ **Network & Performance**
- Are API calls working?
- Is the site acceptably fast?
- Are there network errors?

✅ **Evidence Collection**
- Screenshots of every page
- Network traffic (HAR/JSON)
- Browser trace data
- Detailed logs of every action

---

## CI Gate & Developer Feedback (Phase 5)

Guardian supports regression gating via baselines and emits CI-friendly outputs.

- Baseline storage: commit baseline snapshots under `guardian-baselines/` in your repo for reproducible checks (preferred). Alternatively, use `--artifacts` caching. Use `--baseline-dir` to read/write baselines at a custom path.
- JUnit XML: `guardian baseline check ... --junit <path>` generates a testsuite `odavl-guardian-regression` with one testcase per attempt. Regression types render `<failure>` entries.
- Console summary: Baseline check prints concise summary with overall verdict and regressed attempts.

### Example

1) Save baseline to committed dir:

```
guardian baseline save --url "http://localhost:3000?mode=ok" --name ok-baseline --baseline-dir guardian-baselines --artifacts tmp-artifacts
```

2) Check baseline with JUnit:

```
guardian baseline check --url "http://localhost:3000?mode=ok" --name ok-baseline --baseline-dir guardian-baselines --artifacts tmp-artifacts --junit tmp-artifacts/junit/guardian.xml
```

3) GitHub Actions workflow:

See `.github/workflows/guardian-regression.yml` for a ready-to-use example that uploads HTML/JSON reports and publishes JUnit results.


## What Guardian is NOT

- ❌ A linter or code quality tool
- ❌ A unit test framework
- ❌ A UI script runner (Cypress, Playwright scripts)
- ❌ A monitoring tool for detecting failures after launch
- ❌ An AI demo or marketing tool
- ❌ An auto-fix system

**Attempting to turn Guardian into any of these destroys its purpose.**

---

## Core Philosophy: The Guardian Principle

> A product is only "real" when it survives a series of market-like reality tests.
> 
> Anything before that is assumption, overconfidence, or hope.

Guardian turns assumption into proof.

---

## CLI: The Guardian Command

```bash
npx guardian reality --url <baseUrl> [options]
```

**Core flags:**
- `--timeout <ms>` — Navigation timeout (default: 20000ms)
- `--max-pages <n>` — Maximum pages to visit (default: 25)
- `--max-depth <n>` — Maximum crawl depth (default: 3)
- `--slow-threshold <ms>` — Slow page threshold for scoring (default: 6000ms)

**Evidence flags:**
- `--trace true|false` — Capture browser trace (default: true)
- `--har true|false` — Capture network HAR (default: true)
- `--evidence normal|strict` — Evidence requirement mode (default: normal)
- `--require-har` — Force HAR as required
- `--optional-har` — Make HAR optional

**Flow flags:**
- `--flow <flow-id>` — Execute a predefined user flow (disables crawling)

**Cleanup:**
- `--clean` — Remove artifacts when exit code is 0 (READY)

**Full example:**
```bash
npx guardian reality \
  --url https://example.com \
  --max-pages 50 \
  --max-depth 4 \
  --timeout 25000 \
  --flow pricing-signup \
  --trace true \
  --har true \
  --evidence strict
```

### Exit Codes

| Exit Code | Meaning | Action |
| --- | --- | --- |
| 0 | `READY` — Safe to launch | Proceed with confidence |
| 1 | `DO_NOT_LAUNCH` or `INSUFFICIENT_CONFIDENCE` | Fix issues before launch |
| 2 | Tool error — Guardian crashed | Debug and retry |

---

## Flow Execution: Real User Journeys

When you pass `--flow <flow-id>`, Guardian stops crawling and executes a predefined user journey instead.

### Available Flows

| Flow ID | Description | Use Case |
| --- | --- | --- |
| `login-flow` | Navigate home → type username → type password → click login → wait for dashboard | Verify authentication works |
| `pricing-signup` | Navigate to pricing → click signup → fill form → submit → wait for confirmation | Verify signup flow works |

### Defining Your Own Flow

Flows are defined in configuration files. Each flow contains:

```json
{
  "id": "checkout-flow",
  "name": "Complete Checkout",
  "description": "User navigates to product, adds to cart, and completes payment",
  "steps": [
    { "type": "navigate", "target": "/products/widget-pro" },
    { "type": "click", "target": "button:text('Add to Cart')" },
    { "type": "click", "target": "[data-testid='cart-icon']" },
    { "type": "click", "target": "button:text('Proceed to Checkout')" },
    { "type": "type", "target": "[data-testid='email-input']", "value": "user@example.com" },
    { "type": "click", "target": "[data-testid='submit-order']" },
    { "type": "waitFor", "target": "[data-testid='order-confirmation']" }
  ]
}
```

### Step Types

| Step Type | Example | Behavior |
| --- | --- | --- |
| `navigate` | `navigate /checkout` | Navigate to URL (relative to base URL) |
| `click` | `click button:text('Pay Now')` | Find and click element |
| `type` | `type [data-testid='email']` `user@test.com` | Fill an input field |
| `submit` | `submit form[data-testid='login']` | Click a form submit button |
| `waitFor` | `waitFor [data-testid='success']` | Wait for element to appear |

**Important:** Any step failure immediately stops the flow and triggers `DO_NOT_LAUNCH`. There are no second chances.

---

## Coverage Intelligence: What Guardian Finds

Guardian doesn't just visit your homepage. It explores:

- **Seed discovery** — starts at your base URL
- **Sitemap parsing** — if robots.txt points to sitemap
- **Internal links** — extracts all same-origin links from every page
- **Hint-based routes** — URLs you explicitly mark as critical
- **Multi-level crawling** — explores up to `maxDepth` (default 3)

### Coverage Confidence

| Level | Coverage % | Interpretation |
| --- | --- | --- |
| HIGH | ≥85% | Guardian has seen most of your site |
| MEDIUM | 60–85% | Guardian has reasonable coverage |
| LOW | 30–60% | Gaps exist; verdict is limited |
| INSUFFICIENT | <30% or critical URL uncovered | Not enough data; requires flow or higher coverage |

**Important:** Low coverage can force `INSUFFICIENT_CONFIDENCE` verdict even if everything tested passed.

---

## Evidence: What Guardian Collects

For every run, Guardian captures:

📸 **Screenshots**
- One screenshot per visited page
- One screenshot per flow step
- Clear, timestamped, human-readable

📊 **Network Trace (HAR)**
- Every HTTP request and response
- Headers, timing, payload sizes
- Helps diagnose network issues

🎬 **Browser Trace**
- Compressed trace of all browser actions
- Can be inspected with `npx playwright show-trace`
- Full debugging capability

📋 **Detailed Logs**
- Timestamped log of every action
- Navigation events, errors, warnings
- Network timing and performance

📄 **Reports**
- `report.json` — machine-readable verdict
- `report.html` — beautiful, shareable report
- All evidence bundled and linked

### Evidence Policy

**Normal Mode (default):**
- Screenshots: **Required**
- Trace (when enabled): **Required**
- HAR: **Optional** (warning if missing, doesn't block launch)

**Strict Mode:**
- Screenshots: **Required**
- Trace (when enabled): **Required**
- HAR: **Required**

---

## Final Judgment Logic

Guardian's verdict is deterministic. No randomness. No gray areas.

### Decision Tree

```
IF flow ran AND flow FAILED
  → DO_NOT_LAUNCH (exit code 1)

ELSE IF required evidence is MISSING
  → DO_NOT_LAUNCH (exit code 1)

ELSE IF flow ran AND flow PASSED AND evidence COMPLETE
  → READY (exit code 0)

ELSE IF flow ran AND flow PASSED AND evidence PARTIAL
  → INSUFFICIENT_CONFIDENCE (exit code 1)

ELSE IF coverage HIGH AND evidence COMPLETE
  → READY (exit code 0)

ELSE IF coverage LOW AND no flow
  → INSUFFICIENT_CONFIDENCE (exit code 1)

ELSE IF evidence PARTIAL
  → INSUFFICIENT_CONFIDENCE (exit code 1)

ELSE
  → INSUFFICIENT_CONFIDENCE (exit code 1)
```

### Verdict Definitions

**🟢 READY**
- The market is ready for your product
- Evidence is complete and justified
- All critical checks passed
- Guardian recommends launch

**🔴 DO_NOT_LAUNCH**
- A critical issue was found
- A core user flow failed
- Required evidence is missing
- **Do not ship—fix this first**

**🟡 INSUFFICIENT_CONFIDENCE**
- Guardian cannot confidently recommend
- Coverage is too low
- Evidence is incomplete
- **Run with broader coverage or add a flow**

---

## Installation & Setup

### Prerequisites

- **Node.js 18+** — Guardian requires Node.js 18 or higher
- **npm 8+** — Modern npm version (comes with Node.js 18+)

### Install

```bash
# Clone the repository
git clone https://github.com/odavl/guardian.git
cd odavlguardian

# Install dependencies
npm install
```

The first `npm install` downloads Playwright and Chromium (≈300MB). This is normal and required.

### Verify Installation

```bash
# Test Guardian is accessible
npx guardian reality --help

# Quick sanity check
npx guardian reality --url https://example.com --max-pages 5
```

---

## Quick Start Examples

### 1. Basic Reality Check

```bash
npx guardian reality --url https://your-domain.com
```

**What happens:**
- Crawls up to 25 pages (default)
- Tests each page load and interactivity
- Generates `report.json` and `report.html`
- Exit code 0 = READY, 1 = problem found

### 2. Broad Coverage Check

```bash
npx guardian reality \
  --url https://your-domain.com \
  --max-pages 50 \
  --max-depth 4
```

**Good for:**
- Medium/large sites
- When you need high coverage confidence

### 3. Test a Critical Flow

```bash
npx guardian reality \
  --url https://your-domain.com \
  --flow checkout-flow \
  --timeout 30000 \
  --evidence strict
```

**What happens:**
- Executes your predefined checkout flow
- Every step must succeed or flow fails
- Requires all evidence (strict mode)
- Exit code 0 = flow passed, 1 = flow failed

### 4. Quick Smoke Test

```bash
npx guardian reality \
  --url https://your-domain.com \
  --max-pages 10 \
  --max-depth 2 \
  --trace false
```

**Good for:**
- CI/CD checks
- Fast feedback
- When you don't need detailed trace

### 5. Detailed Inspection

```bash
npx guardian reality \
  --url https://your-domain.com \
  --max-pages 25 \
  --trace true \
  --har true \
  --evidence strict
```

**Generates:**
- Full browser trace (playable in Playwright Inspector)
- Complete network HAR
- Detailed logs
- Screenshots of every page

---

## Reading the Report

### Understanding the HTML Report

The `report.html` is self-contained and shareable. It shows:

- ✅ **Verdict Banner** — READY / DO_NOT_LAUNCH / INSUFFICIENT_CONFIDENCE with reasons
- 📊 **Coverage Section** — pages discovered, visited, coverage %
- 🎬 **Flow Results** (if applicable) — every step with screenshot
- 📋 **Evidence Status** — what was captured, what's missing
- 🖼️ **Screenshots** — thumbnail gallery of every page tested
- 📜 **Logs** — machine-readable timeline of events
- 📁 **Downloads** — links to trace.zip, network.har, raw JSON

### Understanding Exit Codes

Always check exit code after running:

```bash
npx guardian reality --url https://your-domain.com
echo $LASTEXITCODE  # PowerShell: shows 0, 1, or 2
```

| Code | Meaning | Next Step |
| --- | --- | --- |
| 0 | READY — Safe to launch | Deploy with confidence |
| 1 | PROBLEM FOUND — Blocks launch | Review report, fix issue, retry |
| 2 | TOOL ERROR — Guardian crashed | Check logs, debug, try again |

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Guardian Reality Check

on: [push, pull_request]

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run Guardian
        run: npx guardian reality --url https://staging.example.com --max-pages 25
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: guardian-report
          path: artifacts/run-*/report.html
      
      - name: Comment on PR
        if: failure()
        run: echo "🛡️ Guardian found issues. See artifacts for details."
```

---

## The Guardian Contract

Guardian's decisions are governed by a formal contract defining verdict logic, evidence requirements, and confidence semantics.

See the full specification here:

👉 [Guardian Contract (v1)](docs/guardian-contract-v1.md)

This document is the source of truth for:
- How verdicts are calculated
- What constitutes complete evidence
- Confidence levels and their meaning
- Edge cases and precedence rules

---

## Philosophy & Principles

### The Guardian Principle

> A product is only "real" when it survives a series of market-like reality tests.
> 
> Anything before that is assumption.

Guardian refuses to:
- 🚫 Overstate confidence
- 🚫 Ignore broken flows
- 🚫 Pretend partial evidence is sufficient
- 🚫 Autofix problems (you must fix them)
- 🚫 Run after failures are public

Guardian exists to:
- ✅ Prevent silent revenue loss
- ✅ Detect market-reality issues before launch
- ✅ Provide evidence-backed verdicts
- ✅ Give teams genuine peace of mind
- ✅ Protect user trust and brand reputation

### What Guardian is NOT

- ❌ **Not a unit test framework** — Guardian doesn't validate code, it validates market reality
- ❌ **Not a script runner** — Guardian doesn't follow pre-written test scripts, it discovers and tests naturally
- ❌ **Not a linter** — Guardian doesn't rate code quality, it measures user success
- ❌ **Not a monitoring tool** — Guardian runs before failure, not after
- ❌ **Not an auto-fixer** — Guardian identifies problems, you fix them
- ❌ **Not an AI gimmick** — Guardian uses deterministic logic, not ML hype

---

## Testing Phase 4

Run the discovery engine tests:

```bash
npm run test:discovery
```

Expected output:
```
✅ 20/20 tests PASSED

Test Coverage:
  ✓ Safety Model:        7 tests (risky/safe detection)
  ✓ Discovery Engine:    6 tests (crawling, extraction)
  ✓ Snapshot Integration: 7 tests (baseline, structure)

Key Validations:
  ✓ Risky interactions detected and blocked
  ✓ Safe interactions allowed
  ✓ Discovery result structure complete
  ✓ Snapshot integration ready
  ✓ Backward compatibility verified
```

All tests use a local fixture server (`test/discovery-fixture-server.js`) with:
- Safe pages and navigation
- Safe buttons and forms
- Risky buttons (logout, delete) that are blocked
- Safe forms marked with `data-guardian-safe="true"`
- Dangerous forms (payment, account deletion) that are blocked

---

## Troubleshooting

### Guardian times out on slow pages

Increase the timeout:

```bash
npx guardian reality --url https://your-domain.com --timeout 30000
```

### Coverage is too low

Increase max pages and depth:

```bash
npx guardian reality --url https://your-domain.com --max-pages 100 --max-depth 5
```

### A critical page is being skipped

Check if it matches the denylist in `guardian.config.json`. Edit `safety.denyUrlPatterns` to allow safe URLs.

### Flow fails but manual testing works

Guardian is stricter than manual testing. This is intentional. The flow must work automatically without human intervention.

### Report is missing HAR

Check if HAR capture is enabled:

```bash
npx guardian reality --url ... --har true --require-har
```

HAR capture is disabled by default in normal mode (optional). Use `--evidence strict` to require it.

---

## API & Configuration

### Guardian Config File (guardian.config.json)

```json
{
  "baseUrl": "https://your-domain.com",
  "maxPages": 25,
  "maxDepth": 3,
  "timeoutMs": 20000,
  "slowThresholdMs": 6000,
  "traceEnabled": true,
  "harEnabled": true,
  "safety": {
    "denyUrlPatterns": ["logout", "delete", "admin", ...],
    "denySelectors": ["[data-danger]", ".btn-delete", ...],
    "blockFormSubmitsByDefault": true,
    "blockPaymentsByDefault": true
  },
  "discovery": {
    "enableSitemap": true,
    "enableRobotsSitemaps": true,
    "maxDiscoveredUrls": 200
  },
  "artifacts": {
    "baseDir": "./artifacts"
  }
}
```

---

## Support & Contributing

For issues, questions, or contributions:

- **Report a bug**: Create a GitHub issue with Guardian logs
- **Request a feature**: Describe the use case, not the technical implementation
- **Contribute**: Fork, branch, test locally, submit PR

---

## License

ODAVL Guardian is proprietary software. Unauthorized copying or distribution is prohibited.
