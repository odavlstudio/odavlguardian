# Phase 0 — Reality Lock: Quick Start

**Status:** ✅ LOCKED  
**Date:** December 23, 2025

## What Phase 0 Guarantees

Phase 0 locks Guardian's core capabilities with deterministic, provable tests:

1. ✅ **One-command run** produces stable artifacts (JSON + HTML + screenshots)
2. ✅ **Baseline save** creates schema-versioned baseline files
3. ✅ **Baseline check** detects regressions reliably
4. ✅ **Policy gates** produce clear PASS/FAIL for CI/CD
5. ✅ **Output consistency** (same input → same verdict)

## Install & Run

```bash
# Install dependencies
npm install

# Run Phase 0 tests (proves all guarantees)
npm run test:phase0

# Run full test suite
npm run test:all
```

## Local Demo (Against Fixture)

The Phase 0 test uses a local fixture server (no external dependencies).

```bash
# Start fixture server in one terminal
node test/start-fixture.js

# In another terminal, run Guardian
node bin/guardian.js reality --url http://localhost:9999?mode=ok
```

## Core Commands

### Reality Scan

```bash
node bin/guardian.js reality --url http://localhost:9999?mode=ok
```

**Outputs:**
- `artifacts/market-run-YYYYMMDD-HHMMSS/market-report.json`
- `artifacts/market-run-YYYYMMDD-HHMMSS/report.html`
- `artifacts/market-run-YYYYMMDD-HHMMSS/snapshot.json`
- `artifacts/market-run-YYYYMMDD-HHMMSS/{attempt}/attempt-*/` (screenshots, traces)

### Baseline Save

```bash
node bin/guardian.js baseline save --url http://localhost:9999?mode=ok --name my-baseline
```

**Outputs:**
- `artifacts/baselines/my-baseline.json`

### Baseline Check

```bash
# Change fixture to fail mode to simulate regression
node bin/guardian.js baseline check --url http://localhost:9999?mode=fail --name my-baseline
```

**Exit codes:**
- `0` = No regressions
- `1` = Regressions detected

### Policy Gate

```bash
node bin/guardian.js reality --url http://localhost:9999?mode=ok --policy preset:startup
```

**Exit codes:**
- `0` = PASS
- `1` = FAIL
- `2` = FRICTION (startup policy allows this)

## Fixture Modes

The local fixture supports three modes:

| Mode | URL | Behavior |
|------|-----|----------|
| **ok** | `?mode=ok` | All attempts succeed |
| **fail** | `?mode=fail` | All attempts fail (buttons disabled) |
| **friction** | `?mode=friction` | Attempts succeed but slowly (delays) |

## Test Coverage

Phase 0 tests prove:

- ✅ Deterministic artifact generation
- ✅ Baseline schema v1 compliance
- ✅ Regression detection (SUCCESS → FAILURE)
- ✅ Policy evaluation (startup, saas, enterprise presets)
- ✅ Output file naming consistency
- ✅ Run ID uniqueness
- ✅ Evidence path correctness

## File Structure

```
artifacts/
  market-run-20251223-150030/
    market-report.json          # Main report (version 1.0.0)
    report.html                 # Enhanced interactive HTML
    snapshot.json               # Structured snapshot (schema v1)
    contact_form/
      attempt-20251223-150031/
        attempt-report.json     # Attempt-specific JSON
        attempt-report.html     # Attempt-specific HTML
        attempt-screenshots/
          *.jpeg                # Step screenshots
    language_switch/
      ...
    newsletter_signup/
      ...
  baselines/
    my-baseline.json            # Baseline file (schema v1)
```

## Expected Outputs

### market-report.json

```json
{
  "version": "1.0.0",
  "runId": "market-run-20251223-150030",
  "timestamp": "2025-12-23T15:00:30.000Z",
  "baseUrl": "http://localhost:9999?mode=ok",
  "attemptsRun": ["contact_form", "language_switch", "newsletter_signup"],
  "summary": {
    "successCount": 3,
    "frictionCount": 0,
    "failureCount": 0,
    "overallVerdict": "SUCCESS"
  },
  "results": [...]
}
```

### baseline.json

```json
{
  "schemaVersion": 1,
  "guardianVersion": "0.2.0-phase6",
  "baselineName": "my-baseline",
  "createdAt": "2025-12-23T15:00:00.000Z",
  "baseUrl": "http://localhost:9999?mode=ok",
  "attempts": ["contact_form", "language_switch", "newsletter_signup"],
  "overallVerdict": "SUCCESS",
  "perAttempt": [
    {
      "attemptId": "contact_form",
      "attemptName": "Contact Form Submission",
      "outcome": "SUCCESS",
      "totalDurationMs": 1234,
      "totalRetries": 0,
      "frictionSignals": [],
      "steps": [...]
    },
    ...
  ]
}
```

## Verification

After running Phase 0 tests:

```bash
npm run test:phase0
```

You should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PHASE 0 — Reality Lock Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST 1: One-Command Run Produces Deterministic Artifacts
✅ All artifacts verified...

TEST 2: Baseline Save Produces Valid Baseline File
✅ Baseline file verified...

TEST 3: Baseline Check Detects Regressions
✅ Regression detected...

TEST 4: Policy Gates Produce Clear PASS/FAIL
✅ OK mode: verdict=SUCCESS, policy=PASS...
✅ FAIL mode: verdict=FAILURE, policy=FAIL...

TEST 5: Output Consistency Check
✅ Output consistency verified...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE 0 — All Reality Lock Tests PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Next Steps

Phase 0 is complete. Guardian's core reality is now locked and verified.

For production usage, see [WHAT_GUARDIAN_DOES_TODAY.md](./WHAT_GUARDIAN_DOES_TODAY.md)
