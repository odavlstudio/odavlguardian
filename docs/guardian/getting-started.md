# Getting Started with ODAVL Guardian

Guardian is a reality testing engine that checks if your website actually works for real users before you launch.

It's not a code test. It's a browser test. A human-like test.

---

## Installation

Guardian requires Node.js 18.0.0 or higher.

### Option 1: Global Installation (Recommended)

```bash
npm install -g @odavl/guardian
guardian --version
```

On first run, Guardian downloads Playwright browsers (~200MB). This takes 1–2 minutes.

### Option 2: Using npx (No Installation)

```bash
npx @odavl/guardian --url https://example.com
```

This downloads Guardian on-demand and runs immediately. Useful for CI/CD without permanent installation.

### Option 3: Local Installation

```bash
npm install --save-dev @odavl/guardian
npx guardian --url https://example.com
```

---

## Your First Reality Check

### Step 1: Run Guardian Against Your Site

```bash
guardian --url https://example.com
```

Or equivalently:

```bash
guardian reality --url https://example.com
```

Guardian will:
- Open a real browser
- Visit your site like a human would
- Try critical user flows
- Collect evidence
- Give you a verdict

### Step 2: Check the Output

Guardian saves results to `./.odavlguardian/<timestamp>_<site>/`

Key outputs:
- `decision.json` — canonical verdict (`finalVerdict`: READY | FRICTION | DO_NOT_LAUNCH) with `exitCode` (0 | 1 | 2)
- `META.json` — run metadata (`result`: PASSED | WARN | FAILED | PENDING) plus timing and attempt counts

Example `META.json`:

```json
{
  "version": 1,
  "timestamp": "2025-12-25T21:46:59.412Z",
  "url": "http://localhost:3000",
  "siteSlug": "localhost-3000",
  "policy": "startup",
  "result": "PASSED",
  "durationMs": 28000,
  "attempts": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "skipped": 0
  }
}
```

**Key fields:**
- `result` — The outcome: `PASSED`, `WARN`, `FAILED`, or `PENDING`
- `policy` — Which preset was used (startup, saas, enterprise, etc.)
- `attempts` — How many checks ran and passed/failed

### Step 3: Understand the Verdict

Guardian gives three possible verdicts (from `decision.json`):

| Verdict | Meaning | Action |
|---------|---------|--------|
| **READY** | Safe to launch. Users can complete core flows. | ✅ Deploy |
| **FRICTION** | Users will struggle. Some flows work, some break. | ⚠️ Investigate & fix |
| **DO_NOT_LAUNCH** | Critical failures. Users cannot use the site. | 🛑 Block deploy |

---

## Common Scenarios

### Scenario 1: First Run on a Startup Site

```bash
guardian --url https://my-startup.com
```

By default, Guardian uses the `startup` preset — permissive, fast, ideal for early-stage products.

**Expected output:**
- If all core flows work → `READY`
- If some CTAs are broken → `FRICTION`
- If the site is down → `DO_NOT_LAUNCH`

### Scenario 2: SaaS Product with Login

```bash
guardian --url https://my-saas.com --policy preset:saas
```

The SaaS preset includes signup and login flow checks.

### Scenario 3: E-Commerce Shop

```bash
guardian --url https://my-shop.com --policy preset:saas
```

Use the SaaS preset for cart and checkout flow validation.

### Scenario 4: Enterprise Deployment

```bash
guardian --url https://my-enterprise.com --policy preset:enterprise
```

The enterprise preset is strict: zero tolerance for warnings. Requires a baseline for regression detection.

---

## Presets Explained

Guardian includes four built-in presets, each with different tolerance levels.

For a detailed breakdown, see [Presets & Policies](presets.md).

| Preset | Fail Threshold | Max Warnings | Regression Check |
|--------|---|---|---|
| **startup** | CRITICAL only | 999 | No |
| **saas** | CRITICAL | 1 | Yes |
| **enterprise** | WARNING | 0 | Yes |
| **landing-demo** | (demo) | — | — |

Choose a preset based on your product maturity and risk tolerance.

---

## Custom Configuration

Create a `guardian.config.json` in your project root:

```json
{
  "crawl": {
    "maxPages": 10,
    "maxDepth": 2
  },
  "timeouts": {
    "navigationMs": 20000
  },
  "output": {
    "dir": "./.odavlguardian"
  }
}
```

Then run:

```bash
guardian --url https://my-site.com
```

Guardian will automatically load `guardian.config.json` if it exists.

---

## Integration with CI/CD

Guardian integrates with GitHub Actions, GitLab CI, and Bitbucket Pipelines.

For detailed setup instructions, see [CI/CD Integration Guide](ci-integration.md).

### Quick GitHub Actions Example

```yaml
name: Guardian Reality Check

on:
  pull_request:

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npx playwright install --with-deps chromium
      
      - run: npx @odavl/guardian reality --url https://my-site-preview.com
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: guardian-report
          path: .odavlguardian/
```

---

## Troubleshooting

### "Playwright browsers not installed"

**Problem:** Guardian fails with message about Playwright browsers.

**Fix:**

```bash
npx playwright install chromium
```

Or use the shorthand:

```bash
guardian --url https://example.com
```

On first run, Guardian prompts you to install browsers.

### "Connection refused" or "Cannot reach URL"

**Problem:** Guardian cannot connect to your URL.

**Causes:**
- URL is unreachable (check DNS, firewall, VPN)
- Site is down
- Localhost but server not running

**Fix:**
- Verify the URL is reachable: `curl https://example.com`
- For localhost: `guardian --url http://localhost:3000` (use `http://`, not `https://`)
- Check firewall rules

### "Timeout waiting for page to load"

**Problem:** Guardian times out waiting for a page.

**Cause:** Page takes longer than default timeout (30 seconds).

**Fix:**

```bash
guardian --url https://example.com --timeout 60000
```

Timeout is in milliseconds.

### "Policy not found"

**Problem:** `Error: Policy file not found: my-custom-policy.json`

**Fix:**
- Ensure the policy file path is correct (relative to current directory)
- Or use a built-in preset:

```bash
guardian --url https://example.com --policy preset:saas
```

---

## Next Steps

- **Learn about presets:** [Presets & Policies](presets.md)
- **Set up CI/CD:** [CI/CD Integration](ci-integration.md)
- **View sample reports:** [Sample Report](https://odavlguardian.vercel.app/report/sample)
- **Read the contract:** [Guardian Contract v1](guardian-contract-v1.md)

---

## Getting Help

- Check the [README](../../README.md) for an overview
- Run `guardian --help` for full CLI reference
- View the [contract](guardian-contract-v1.md) for technical details
