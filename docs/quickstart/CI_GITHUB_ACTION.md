# Quickstart: Guardian in GitHub Actions (CI/CD)

**Goal:** Add Guardian to your deployment pipeline and block unsafe launches.  
**Time:** ~5 minutes  
**Audience:** Release Engineers / DevOps Operators

---

## Overview

Guardian is the final decision authority before launch. It observes your website as real users experience it, then issues a binding verdict:

- **READY** (exit 0) → Safe to launch
- **FRICTION** (exit 1) → Investigate; don't launch yet
- **DO_NOT_LAUNCH** (exit 2) → Fix the issues; block deployment

---

## Step 1: Add Workflow File

Create a file in your repository:

```
.github/workflows/guardian-gate.yml
```

**Minimal workflow (copy/paste ready):**

```yaml
name: Guardian Deployment Gate

on:
  pull_request:
  push:
    branches: [main, staging]

jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: odavlstudio/guardian@v1
        with:
          url: https://staging.example.com
          preset: landing
          fail-on: risk
        id: guardian

      - name: Check Guardian verdict
        run: |
          echo "Verdict: ${{ steps.guardian.outputs.verdict }}"
          echo "Exit code: ${{ job.status }}"

      - name: Block unsafe deployments
        if: failure()
        run: |
          echo "Guardian blocked this deployment."
          echo "Verdict: ${{ steps.guardian.outputs.verdict }}"
          exit 1
```

---

## Step 2: Configure for Your Site

Update the workflow with your URL and preset:

```yaml
- uses: odavlstudio/guardian@v1
  with:
    url: https://your-staging-site.com    # Your staging URL
    preset: landing                         # See presets below
    fail-on: risk                          # Stop on FRICTION or DO_NOT_LAUNCH
```

### Preset Options

Choose the preset that matches your site type:

| Preset | Best For | Checks |
|--------|----------|--------|
| `landing` | Marketing pages, homepage | Navigation, CTAs, form submission |
| `saas` | SaaS apps, dashboards | Login, signup, core flows |
| `startup` | Early-stage products | Core user journey only |
| `enterprise` | Complex workflows | Full feature matrix (slower) |

Not sure? Start with `landing`.

---

## Step 3: Understand Exit Codes

Guardian always exits with a clear code:

| Exit Code | Verdict | Meaning | Action |
|-----------|---------|---------|--------|
| 0 | **READY** | All critical flows work. Safe to launch. | Deploy. |
| 1 | **FRICTION** | Some flows have issues or uncertainty. | Investigate and re-run. |
| 2 | **DO_NOT_LAUNCH** | Critical issues found. | Fix the site; block deployment. |

Use these in your pipeline:

```yaml
- name: Deploy if ready
  if: steps.guardian.outputs.verdict == 'READY'
  run: ./deploy.sh
  
- name: Alert if friction
  if: steps.guardian.outputs.verdict == 'FRICTION'
  run: echo "Guardian found issues. Review decision.json."
```

---

## Step 4: Review Guardian's Decision

After the action runs, find artifacts:

### decision.json (Machine-Readable)

Located in: GitHub Actions → Artifacts → `guardian-decision.json`

**What to scan:**
- `verdict` — The final decision (READY | FRICTION | DO_NOT_LAUNCH)
- `confidence` — How sure Guardian is (0-100)
- `reasons` — Why Guardian made this decision
- `attemptResults` — What each user flow did (pass/fail/friction)

**Example:**
```json
{
  "verdict": "READY",
  "confidence": 92,
  "reasons": ["5 flows completed successfully"],
  "attemptResults": [
    {
      "attemptName": "Homepage Navigation",
      "outcome": "SUCCESS"
    },
    {
      "attemptName": "Signup Flow",
      "outcome": "SUCCESS"
    }
  ]
}
```

### HTML Report (Human-Readable)

Located in: GitHub Actions → Artifacts → `guardian-report.html`

**What to scan:**
- **Verdict section** — The headline decision
- **Observed Flows** — Which user journeys succeeded
- **Failure Details** — Screenshots/traces if a flow failed
- **Confidence Signals** — Evidence for the verdict

---

## Step 5: Common Next Steps

### Guardian says READY
✓ Deploy with confidence. All critical flows work.

### Guardian says FRICTION
⚠ **Do not deploy yet.** Guardian found issues:
1. Open `decision.json`
2. Check `reasons` array — what Guardian found
3. Review `attemptResults` — which flows failed
4. Fix the site
5. Re-run Guardian
6. If READY, deploy

### Guardian says DO_NOT_LAUNCH
✗ **Deployment blocked.** Critical issues found:
1. Open `guardian-report.html`
2. Check **Failure Details** — see what broke
3. Fix the site
4. Re-run Guardian
5. Wait for READY or FRICTION
6. If READY, deploy

---

## Step 6: Tune Your Pipeline (Optional)

### Use different presets for different branches

```yaml
- uses: odavlstudio/guardian@v1
  with:
    url: https://staging.example.com
    preset: ${{ github.ref == 'refs/heads/main' && 'enterprise' || 'landing' }}
    fail-on: risk
```

### Fail only on critical issues

```yaml
fail-on: risk  # FRICTION passes; only DO_NOT_LAUNCH blocks
```

### Run Guardian on multiple URLs

```yaml
- uses: odavlstudio/guardian@v1
  with:
    url: https://staging.example.com/signup
    preset: landing
    fail-on: risk
    
- uses: odavlstudio/guardian@v1
  with:
    url: https://staging.example.com/checkout
    preset: saas
    fail-on: risk
```

---

## Troubleshooting

### "Guardian says DO_NOT_LAUNCH but the site looks fine"

Guardian sees issues you don't see because:
- **Playwright sees the real browser** — Emulates a real user with network, JavaScript, CSS
- **Guardian runs actual user flows** — Not just static checks
- **Your staging may be broken** — But you haven't noticed yet

**Action:**
1. Open `guardian-report.html`
2. Find the failure screenshot
3. Reproduce it manually in your browser
4. Fix the issue
5. Re-run Guardian

### "Workflow times out"

Guardian may be slow on complex sites:
- Use smaller preset (`landing` instead of `enterprise`)
- Set `preset: startup` for quick validation
- Or increase timeout in your workflow

```yaml
- uses: odavlstudio/guardian@v1
  timeout-minutes: 10  # Increase if needed
  with:
    url: https://staging.example.com
    preset: startup
```

### "URL unreachable"

Guardian can't reach your staging site:
- **Check staging is live** — `curl https://staging.example.com`
- **Check firewall rules** — GitHub Actions IPs must reach your site
- **Check DNS** — Staging domain must resolve

---

## Need Help?

- **Guardian blocked a false positive?** Check decision.json for reasons. If the verdict is wrong, contact support.
- **Want to understand Guardian better?** Read [ONE_LINER.md](../ground-truth/ONE_LINER.md) and [CORE_PROMISE.md](../ground-truth/CORE_PROMISE.md)
- **Have questions about a verdict?** Examine `guardian-report.html` first, then check the full run logs.

---

## What Happens Under the Hood

When you run the action:

1. **Guardian launches a real browser** — Playwright chromium
2. **Navigates to your URL** — The exact staging site
3. **Executes user flows** — Navigation, forms, clicks, etc.
4. **Observes what happens** — Successes, failures, timeouts
5. **Applies policy rules** — Your preset's criteria
6. **Issues a verdict** — READY | FRICTION | DO_NOT_LAUNCH
7. **Writes artifacts** — decision.json, HTML report, traces
8. **Sets exit code** — 0, 1, or 2

**Key insight:** Guardian doesn't run automated tests. It observes your site like a real user would. So the verdict is based on real user reality, not test assumptions.

---

## Learn More

- [Product Definition](../ground-truth/ONE_LINER.md)
- [Core Promise](../ground-truth/CORE_PROMISE.md)
- [CLI Reference](../../README.md)
