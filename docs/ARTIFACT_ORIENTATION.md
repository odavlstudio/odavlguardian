# Reading Guardian Artifacts

After Guardian runs, you get two key files. Here's what to look for.

---

## decision.json (Machine-Readable)

**Location:** In your run directory or downloaded from CI/CD artifact storage

**What it is:** A JSON file with Guardian's complete analysis and verdict.

### Key Fields

```json
{
  "verdict": "READY",
  "confidence": 92,
  "reasons": [
    "5 critical flows completed successfully",
    "No policy violations detected"
  ],
  "attemptResults": [
    {
      "attemptName": "Homepage Navigation",
      "outcome": "SUCCESS",
      "evidence": "Loaded homepage, clicked CTA, confirmed button click"
    },
    {
      "attemptName": "Signup Flow",
      "outcome": "SUCCESS",
      "evidence": "Filled form, submitted, received confirmation"
    }
  ]
}
```

### What to scan

| Field | Meaning | Action |
|-------|---------|--------|
| `verdict` | **READY** = safe, **FRICTION** = issues, **DO_NOT_LAUNCH** = critical | If FRICTION/DO_NOT_LAUNCH, see `reasons` below |
| `confidence` | 0-100 score of Guardian's certainty | Higher is better; >80 is strong |
| `reasons` | Why Guardian made this verdict | Read these first to understand the decision |
| `attemptResults` | Each user flow tested and its result | Find which flows failed, if any |

### Parsing decision.json

**In a pipeline:**
```bash
# Extract the verdict
VERDICT=$(jq -r '.verdict' decision.json)

# Block if critical
if [ "$VERDICT" = "DO_NOT_LAUNCH" ]; then
  echo "Deployment blocked"
  exit 1
fi

# Or just fail on non-READY
if [ "$VERDICT" != "READY" ]; then
  echo "Guardian found issues. See report."
  exit 1
fi
```

**Why this matters:**
- Your pipeline can be deterministic (not depend on humans reading reports)
- You can set different policies (block only on DO_NOT_LAUNCH, or warn on FRICTION)
- Each run is logged and auditable

---

## HTML Report (Human-Readable)

**Location:** In your run directory or downloaded from CI/CD artifact storage as `guardian-report.html`

**What it is:** A formatted report showing Guardian's observations with screenshots and traces.

### What to scan (in order)

#### 1. Verdict Section (Top)

Shows the headline decision and confidence:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERDICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: DO_NOT_LAUNCH
Meaning: Critical issues found. Do not launch until resolved.
Confidence: 87%

Top Reasons:
1. Payment flow failed on form submission
2. Error page displayed instead of success
3. Database timeout in checkout
```

**Action if DO_NOT_LAUNCH:**
- Read the top reasons
- Find the failed flow section below
- Look at screenshots/traces
- Fix the site

#### 2. What Was Observed (Middle)

Shows which flows ran and which were skipped:

```
What Was Observed
──────────────────────────────────────────────────

5 user flow(s) executed successfully

Key flows:
- Homepage Navigation ✓
- Signup Flow ✓
- Login Flow ✓
- Checkout Process ✗
- Payment Flow ✗
```

**Action:**
- If you expect a flow to run but it's not listed, check "What Was NOT Observed" below
- If a flow failed (marked ✗), click to see details

#### 3. Flow Details (Detailed Sections)

For each flow, you'll see:

**✓ Success Flow:**
```
Homepage Navigation [SUCCESS]
───────────────────────────────────

Steps Executed:
1. Navigate to https://example.com
   ✓ Page loaded (0.5s)
   
2. Locate home button
   ✓ Found on page
   
3. Click home button
   ✓ Clicked; page responsive
```

**✗ Failed Flow:**
```
Payment Flow [FAILURE]
───────────────────────────────────

Steps Executed:
1. Navigate to checkout
   ✓ Page loaded

2. Fill payment form
   ✓ Form filled

3. Submit payment
   ✗ ERROR: Timeout after 20s

Screenshots:
  [Click to view] Payment form submission screenshot
  [Click to view] Blank page (timeout)

Traces:
  [Click to view] Full browser trace (HAR file)
```

**Action:**
- Look at the screenshot of the failure
- See what the page showed when it failed
- Reproduce manually in your browser to confirm
- Fix the issue on your site

#### 4. What Was NOT Observed (Near End)

Shows flows that were skipped and why:

```
What Was NOT Observed
──────────────────────────────────────────────────

2 flow(s) not observed:
- Admin Panel (disabled by enterprise preset)
- International Checkout (not applicable; no geo-routing)
```

**Action:**
- If a skipped flow should have run, check your preset choice
- Or create a custom flow

---

## Common Report Reading Scenarios

### Scenario 1: Verdict is READY

**Guardian says:** All critical flows completed successfully. Safe to launch.

**Action:** ✓ Deploy. You're good to go.

---

### Scenario 2: Verdict is FRICTION

**Guardian says:** Some user flows encountered issues. Launch with caution.

**Report shows:** Some flows passed, some failed or timed out.

**Action:**
1. Read the **Top Reasons** section
2. Find the failed flow in **Flow Details**
3. Look at the screenshot when it failed
4. Reproduce manually (open your site, try that flow)
5. Fix the issue on your staging site
6. Re-run Guardian
7. If READY, deploy; if still FRICTION, investigate further

---

### Scenario 3: Verdict is DO_NOT_LAUNCH

**Guardian says:** Critical issues found. Do not launch until resolved.

**Report shows:** One or more critical flows failed.

**Action:**
1. Read the **Top Reasons** section
2. Open the failed flow's screenshot
3. Understand what broke
4. Fix it on your staging site
5. Re-run Guardian
6. Wait for READY or FRICTION
7. If READY, deploy
8. If FRICTION, investigate further

---

## Tips

**Screenshot looks blank?**
- The page may not have loaded
- JavaScript may not have executed
- Guardian's timeout may be too short
- Check "Traces" (HAR file) for network details

**Can't see why a flow failed?**
- Download the HAR file (full browser trace)
- Open in a HAR viewer to see network requests/responses
- Check for HTTP errors (404, 500, etc.)

**Want to adjust which flows run?**
- Change your preset (landing vs saas vs enterprise)
- Or pass `--attempts` flag with specific flow names
- Re-run Guardian

**Report shows flows you don't care about?**
- Your preset runs more flows than you expected
- Choose a smaller preset (landing vs enterprise)
- Or filter with `--attempts` flag

---

## Learn More

- [Quickstart: Guardian in GitHub Actions](../quickstart/CI_GITHUB_ACTION.md)
- [Core Promise](../ground-truth/CORE_PROMISE.md)
- [Product Definition](../ground-truth/ONE_LINER.md)
