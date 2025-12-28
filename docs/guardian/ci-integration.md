# CI/CD Integration

Guardian integrates with GitHub Actions, GitLab CI, and Bitbucket Pipelines.

This guide shows how to add reality checks to your continuous integration pipeline.

---

## GitHub Actions

Guardian works with GitHub Actions via:
1. **GitHub Action** (recommended for simplicity)
2. **Workflow with npx** (full control)

### Option A: Using the Guardian GitHub Action

The Guardian GitHub Action is the easiest way to integrate.

**File:** [.github/workflows/guardian-pr-gate.yml](../../.github/workflows/guardian-pr-gate.yml)

**Setup:**

1. Create `.github/workflows/guardian.yml` in your repo:

```yaml
name: Guardian Reality Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

env:
  GUARDIAN_BASE_URL: ${{ secrets.GUARDIAN_PREVIEW_BASE_URL }}
  ARTIFACTS_DIR: artifacts/guardian/pr-${{ github.run_number }}

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run Guardian
        run: |
          mkdir -p "$ARTIFACTS_DIR"
          npx @odavl/guardian reality \
            --url "$GUARDIAN_BASE_URL" \
            --artifacts "$ARTIFACTS_DIR"

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: guardian-artifacts
          path: artifacts/guardian/
```

2. **Add a repository secret:**
   - Go to **Settings → Secrets and variables → Actions**
   - Create secret: `GUARDIAN_PREVIEW_BASE_URL` = `https://preview.example.com`

3. **Push and open a PR** — Guardian runs automatically.

### Option B: Using the Guardian Action (Official)

Even simpler:

```yaml
name: Guardian Reality Check

on:
  pull_request:

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Guardian Reality Check
        uses: odavlstudio/odavlguardian@v1
        with:
          url: https://preview.example.com
          preset: startup
          fail-on: any

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: guardian-report
          path: .odavlguardian/
```

The action installs Playwright chromium and required OS dependencies automatically; no extra setup steps are needed in your workflow.

**Action Inputs:**

| Input | Required | Default | Example |
|-------|----------|---------|---------|
| `url` | Yes | — | `https://example.com` |
| `preset` | No | `startup` | `saas`, `enterprise` |
| `config` | No | — | `guardian.config.json` |
| `fail-on` | No | `any` | `none`, `friction`, `risk` |
| `artifacts` | No | `.odavlguardian` | `./reports` |

**Action Outputs:**

```yaml
- name: Check verdict
  run: |
    echo "Verdict: ${{ steps.guardian.outputs.verdict }}"
    echo "Exit code: ${{ steps.guardian.outputs.exit-code }}"
```

Available outputs:
- `verdict` — READY, FRICTION, DO_NOT_LAUNCH
- `exit-code` — 0 (success) or non-zero (failure)
- `run-id` — Unique identifier for the run

To publish/update the canonical tag used above (`odavlstudio/odavlguardian@v1`), trigger the `Action Release Tag` workflow (workflow_dispatch) which force-updates tag `v1` to the chosen ref.

---

## GitLab CI

Guardian integrates with GitLab CI via the provided template.

**File:** [.gitlab-ci.yml](../../.gitlab-ci.yml)

**Setup:**

1. Add this to your `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - scan

guardian:scan:
  stage: scan
  image: node:20
  before_script:
    - npm ci
    - npx playwright install --with-deps chromium
  script:
    - mkdir -p artifacts/guardian
    - npx @odavl/guardian reality \
        --url "$GUARDIAN_URL" \
        --artifacts artifacts/guardian \
        --trace false \
        --har false
  artifacts:
    paths:
      - artifacts/guardian/**
    reports:
      junit: artifacts/guardian/**/junit.xml
    expire_in: 30 days
  allow_failure: true
  only:
    - main
    - merge_requests
```

2. **Set the environment variable:**
   - Go to **Settings → CI/CD → Variables**
   - Create variable: `GUARDIAN_URL` = `https://staging.example.com`

3. **Trigger:** Guardian runs on push to `main` or when a merge request is created.

**Controlling Guardian via Variables:**

| Variable | Example | Effect |
|----------|---------|--------|
| `GUARDIAN_URL` | `https://example.com` | Target URL (required) |
| `GUARDIAN_PRESET` | `saas` | Which preset to use |
| `GUARDIAN_TIMEOUT` | `60000` | Timeout in milliseconds |

---

## Bitbucket Pipelines

Guardian integrates with Bitbucket Pipelines.

**File:** [bitbucket-pipelines.yml](../../bitbucket-pipelines.yml)

**Setup:**

1. Create or update `bitbucket-pipelines.yml`:

```yaml
image: node:20

definitions:
  steps:
    - step: &guardian-scan
        name: Guardian Reality Check
        script:
          - npm ci
          - npx playwright install --with-deps chromium
          - mkdir -p artifacts/guardian
          - |
            if [ -z "$GUARDIAN_URL" ]; then
              echo "⚠️  GUARDIAN_URL not set. Skipping Guardian scan."
              echo "To enable: set GUARDIAN_URL in repository variables"
              exit 0
            fi
          - echo "🛡️  Running Guardian..."
          - npx @odavl/guardian reality \
              --url "$GUARDIAN_URL" \
              --artifacts artifacts/guardian \
              --trace false \
              --har false
        artifacts:
          - artifacts/guardian/**

pipelines:
  default:
    - step: *guardian-scan
  branches:
    main:
      - step: *guardian-scan
    develop:
      - step: *guardian-scan
```

2. **Set the environment variable:**
   - Go to **Repository settings → Pipelines → Repository variables**
   - Create variable: `GUARDIAN_URL` = `https://preview.example.com`

3. **Trigger:** Guardian runs on push to any branch.

---

## Common CI/CD Patterns

### Pattern 1: Staging Preview URL

Guardian checks a deployed preview before merging to main.

```bash
npx @odavl/guardian reality --url https://preview-$CI_COMMIT_SHA.example.com
```

### Pattern 2: Specific Preset

Run with a stricter policy on main branch.

```bash
# On feature branches: use startup (permissive)
npx @odavl/guardian reality --url $URL --policy preset:startup

# On main: use saas (stricter)
npx @odavl/guardian reality --url $URL --policy preset:saas
```

### Pattern 3: Fail on Critical Issues Only

Allow warnings in CI but fail on critical issues.

```bash
npx @odavl/guardian reality --url $URL --policy preset:startup
```

The `startup` preset only fails on CRITICAL severity issues.

### Pattern 4: Custom Policy

Reference a custom policy file:

```bash
npx @odavl/guardian reality --url $URL --policy ./policies/ci-policy.json
```

### Pattern 5: Conditional Runs (Expensive)

Skip Guardian on every commit; run only on PR merge:

**GitHub Actions:**
```yaml
on:
  push:
    branches: [main]
```

**GitLab CI:**
```yaml
only:
  - merge_requests
```

**Bitbucket Pipelines:**
```yaml
branches:
  main:
    - step: *guardian-scan
```

---

## Troubleshooting CI/CD

### Problem: "Playwright browsers not installed"

Guardian needs Chromium browser. Add to CI:

```bash
npx playwright install --with-deps chromium
```

All three templates above include this step.

### Problem: "GUARDIAN_URL not set"

The CI environment variable is missing.

**Fix:**
- GitHub: Add secret in **Settings → Secrets and variables → Actions**
- GitLab: Add variable in **Settings → CI/CD → Variables**
- Bitbucket: Add variable in **Repository settings → Pipelines → Repository variables**

### Problem: "Connection refused" or "Timeout"

Guardian cannot reach the preview URL.

**Causes:**
- Preview URL is down
- Firewall blocks CI runner from reaching URL
- URL is on private network (CI cannot reach it)

**Fix:**
- Verify preview URL is publicly accessible
- Check firewall rules
- Use public staging URL, not localhost

### Problem: Artifact upload fails

Guardian runs but artifact upload fails.

**Fix:**
- Ensure artifact directory path is correct
- For GitHub: use `actions/upload-artifact@v4`
- For GitLab: artifact paths must exist
- For Bitbucket: paths must be relative to repo root

### Problem: CI always passes even when Guardian fails

Guardian output might not be failing the build.

**Fix:**
- Use `allow_failure: false` in GitLab
- Use `|| exit 1` after Guardian command to propagate exit code
- In GitHub Actions, the action automatically fails the build on bad verdict

---

## Advanced: Artifact Collection & Reporting

### GitHub Actions: Comment on PR

```yaml
- name: Comment Guardian verdict on PR
  uses: actions/github-script@v7
  if: always()
  with:
    script: |
      const fs = require('fs');
      const report = JSON.parse(fs.readFileSync('artifacts/guardian/*/META.json', 'utf8'));
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## 🛡️ Guardian Reality Check\n\n**Verdict:** ${report.result}\n**Duration:** ${report.durationMs}ms`
      });
```

### GitLab CI: Store Artifacts

```yaml
artifacts:
  paths:
    - artifacts/guardian/**
  reports:
    junit: artifacts/guardian/**/junit.xml
  expire_in: 30 days
```

Artifacts are available in **Pipelines → Job artifacts**.

### Bitbucket Pipelines: Store Artifacts

```yaml
artifacts:
  - artifacts/guardian/**
```

Access artifacts in **Pipelines → Artifacts**.

---

## Best Practices

### 1. Protect Against Flakes

Guardian is deterministic, but network can be flaky.

```bash
# Retry failed runs
npx @odavl/guardian reality --url $URL && exit 0 || \
npx @odavl/guardian reality --url $URL
```

### 2. Monitor Performance

Track Guardian runtime over time:

```bash
echo "Guardian took $(jq .durationMs artifacts/guardian/*/META.json)ms"
```

### 3. Archive Results

Keep Guardian reports for analysis:

```yaml
artifacts:
  name: guardian-$CI_COMMIT_SHA
  paths:
    - artifacts/guardian/**
  expire_in: 90 days
```

### 4. Notify on Failure

Alert team if Guardian blocks merge:

```bash
if [ $GUARDIAN_VERDICT != "READY" ]; then
  echo "⚠️  Guardian verdict: $GUARDIAN_VERDICT"
  echo "Review artifacts before merging"
fi
```

### 5. Test Against Staging, Not Production

Always use a staging/preview URL, never production:

```bash
# ✅ Good
--url https://preview.example.com

# ❌ Bad (don't do this)
--url https://example.com
```

---

## Next Steps

- **Getting Started:** [Getting Started Guide](getting-started.md)
- **Presets:** [Presets & Policies](presets.md)
- **Sample Report:** [View Example](https://odavlguardian.vercel.app/report/sample)
- **Contract:** [Guardian Contract v1](guardian-contract-v1.md)

---

## Support

- Run `guardian --help` for CLI reference
- Check logs in CI artifact artifacts
- Open an issue on [GitHub](https://github.com/odavlstudio/odavlguardian)
