# Presets & Policies

Guardian includes four built-in presets optimized for different product types and risk tolerances.

A **preset** is a policy configuration that determines:
- What severity level causes failure
- How many warnings are allowed
- Whether to check for regressions
- How strict verification is

Choose a preset based on your product maturity and deployment risk.

---

## Quick Reference

| Preset | For... | Fail Severity | Max Warnings | Regression Check | Baseline Required |
|--------|--------|---|---|---|---|
| **startup** | Early-stage, MVP, landing pages | CRITICAL only | 999 | No | No |
| **saas** | SaaS products, apps with login | CRITICAL | 1 | Yes | No |
| **enterprise** | Large orgs, compliance-heavy | WARNING | 0 | Yes | Yes |
| **landing-demo** | Demo/showcase (permissive) | CRITICAL | 999 | No | No |

---

## Startup Preset

**When to use:** Early-stage products, MVPs, landing pages, rapid iteration

```bash
guardian --url https://example.com --policy preset:startup
```

**What it checks:**
- Core navigation works
- Primary CTAs are reachable
- No catastrophic failures (5xx, page crashes)
- Basic SEO elements present (title, meta description)

**Failure criteria:**
- Any CRITICAL issue → Fail
- Up to 999 warnings allowed
- No regression detection (baseline not required)

**Philosophy:** Move fast. Catch only the show-stoppers.

**Example output:**
```
READY — Site is safe to launch
Coverage: 85%
Confidence: MEDIUM
Warnings: 3 (allowed)
```

---

## SaaS Preset

**When to use:** Software-as-a-Service products with user accounts, apps with signup/login

```bash
guardian --url https://my-saas.com --policy preset:saas
```

**What it checks:**
- All startup checks
- Signup flow (if present)
- Login flow (if present)
- Dashboard access
- User account page
- Core user journeys

**Failure criteria:**
- Any CRITICAL issue → Fail
- More than 1 WARNING → Fail
- New regressions detected → Fail (requires baseline)
- Critical user flows must complete

**Philosophy:** Users trust you with their data. Higher bar for safety.

**Example output:**
```
FRICTION — Users will struggle with signup
Coverage: 92%
Confidence: HIGH
Warnings: 2 (allowed: 1)
Regressions: None
```

---

## Enterprise Preset

**When to use:** Large organizations, compliance-heavy products, mission-critical deployments

```bash
guardian --url https://my-enterprise.com --policy preset:enterprise
```

**What it checks:**
- All SaaS checks
- Security headers (HTTPS, CSP, X-Frame-Options, etc.)
- Compliance pages (Privacy, Terms, Security)
- Accessibility basics (alt text, ARIA labels)
- Performance baselines
- Detailed regression analysis

**Failure criteria:**
- Any WARNING or CRITICAL → Fail
- Zero warnings allowed
- Any regression from baseline → Fail
- **Baseline is required** — first run creates it, second run compares

**Philosophy:** Zero surprises. Everything must be auditable and measurable.

**Example output:**
```
DO_NOT_LAUNCH — Security policy missing, performance regressed
Coverage: 100%
Confidence: HIGH
Warnings: 0 allowed (found 3)
Regressions: Performance -12% from baseline
```

---

## Landing Demo Preset

**When to use:** Demos, marketing showcases, internal testing

```bash
guardian --url https://demo.example.com --policy preset:landing-demo
```

**What it checks:**
- Same as startup (basic checks)
- Optimized for fast execution on simple sites

**Failure criteria:** Only CRITICAL issues

**Philosophy:** Quick feedback for simple showcase sites.

---

## Using Presets

### Method 1: CLI Flag (Recommended)

```bash
guardian --url https://example.com --policy preset:startup
guardian --url https://example.com --policy preset:saas
guardian --url https://example.com --policy preset:enterprise
```

### Method 2: Guardian Config File

Create `guardian.config.json`:

```json
{
  "policy": "preset:saas",
  "crawl": {
    "maxPages": 20,
    "maxDepth": 3
  }
}
```

Then run:

```bash
guardian --url https://my-saas.com
```

### Method 3: Generate a Template

```bash
guardian template saas
```

This creates a `guardian.config.json` with the SaaS preset and default settings.

Available templates: `startup`, `saas`, `enterprise`

---

## Custom Policies

To create a custom policy, define a JSON file:

```json
{
  "name": "My Custom Policy",
  "description": "Fail on CRITICAL and WARNING",
  "failOnSeverity": "WARNING",
  "maxWarnings": 5,
  "maxInfo": 999,
  "maxTotalRisk": 100,
  "failOnNewRegression": true,
  "failOnSoftFailures": false,
  "softFailureThreshold": 10,
  "requireBaseline": false
}
```

Then use it:

```bash
guardian --url https://example.com --policy ./my-policy.json
```

---

## Understanding Policy Fields

| Field | Type | Meaning |
|-------|------|---------|
| `failOnSeverity` | CRITICAL, WARNING, INFO | Minimum issue severity that causes failure |
| `maxWarnings` | number | How many WARNING-level issues are allowed before failing |
| `maxInfo` | number | How many INFO-level issues are allowed (usually high) |
| `maxTotalRisk` | number | Total risk score allowed before failing |
| `failOnNewRegression` | boolean | Fail if performance/metrics regressed from baseline |
| `failOnSoftFailures` | boolean | Fail on non-critical failures (slow pages, UX friction) |
| `softFailureThreshold` | number | Threshold for what counts as a soft failure |
| `requireBaseline` | boolean | Require a baseline for first run; error if none exists |

---

## Migration Between Presets

As your product matures, you can move to stricter presets.

### From Startup to SaaS

When you add a signup flow:

```bash
guardian --url https://example.com --policy preset:startup  # Old
guardian --url https://example.com --policy preset:saas      # New
```

Guardian will detect new signup/login flows and check them.

### From SaaS to Enterprise

When you deploy to production:

```bash
# Create baseline
guardian --url https://example.com --policy preset:enterprise --save-baseline

# Future runs check for regressions
guardian --url https://example.com --policy preset:enterprise
```

---

## Preset Comparison Matrix

| Check | Startup | SaaS | Enterprise |
|-------|---------|------|-----------|
| Navigation | ✅ | ✅ | ✅ |
| CTAs & Forms | ✅ | ✅ | ✅ |
| Signup Flow | — | ✅ | ✅ |
| Login Flow | — | ✅ | ✅ |
| Security Headers | — | — | ✅ |
| Compliance Pages | — | — | ✅ |
| Accessibility | — | — | ✅ |
| Performance Baseline | — | — | ✅ |
| Regression Detection | No | Yes* | Yes |
| Failure Threshold | CRITICAL | CRITICAL | WARNING |
| Warning Tolerance | High | Low (1) | Zero (0) |

*SaaS regression detection is optional (not required on first run)

---

## FAQ

### Q: Which preset should I use?

**A:** Start with `startup`. When you add user accounts, switch to `saas`. Before production, use `enterprise`.

### Q: Can I change presets mid-project?

**A:** Yes. Guardian will detect the change. Regressions are only checked if you explicitly enable `failOnNewRegression`.

### Q: What happens if my baseline is outdated?

**A:** With `enterprise`, outdated baselines will cause false positives. Refresh your baseline after intentional changes:

```bash
guardian --url https://example.com --policy preset:enterprise --save-baseline
```

### Q: Can I use a custom policy in CI/CD?

**A:** Yes, commit your policy JSON and reference it:

```bash
guardian --url https://example.com --policy ./policies/my-policy.json
```

### Q: What if the preset doesn't fit my needs exactly?

**A:** Create a custom policy JSON file with the exact settings you need, then reference it in CI/CD.

---

## Next Steps

- **Get started:** [Getting Started Guide](getting-started.md)
- **Set up CI/CD:** [CI/CD Integration](ci-integration.md)
- **View policies:** `.../policies/` directory in Guardian repo
