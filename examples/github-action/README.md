# GitHub Actions Example: Minimal Guardian Gate

## What This Proves

This example proves that Guardian can be integrated into a GitHub Actions workflow as a deployment gate in under 10 minutes.

**Verdict:** Before any deployment, run Guardian. Block the pipeline if Guardian says "do not launch."

---

## How It Works

1. On every PR and push to main/staging
2. Run Guardian against your staging site
3. Guardian observes the site as a real user would
4. Issues a binding verdict
5. Blocks deployment if verdict is FRICTION or DO_NOT_LAUNCH

---

## Files

- `workflow.yml` — Minimal, runnable GitHub Actions workflow

---

## Setup

### 1. Copy the workflow

Copy `workflow.yml` to your repository:

```bash
mkdir -p .github/workflows
cp workflow.yml /path/to/your/repo/.github/workflows/guardian-gate.yml
```

### 2. Update the URL

Open `.github/workflows/guardian-gate.yml` and change:

```yaml
url: https://staging.example.com  # Your staging URL
```

### 3. Choose a preset

Depending on your site type:

- **Landing page / Homepage** → `landing`
- **SaaS / Dashboard / App** → `saas`
- **Complex multi-flow** → `enterprise`
- **Quick validation** → `startup`

Update in the workflow:

```yaml
preset: landing  # Change this
```

### 4. Push and trigger

```bash
git add .github/workflows/guardian-gate.yml
git commit -m "Add Guardian deployment gate"
git push origin main
```

The workflow runs automatically on pull requests and pushes.

---

## Reading the Results

After Guardian runs:

1. Check the GitHub Actions log — see the verdict printed
2. Download artifacts:
   - `guardian-decision.json` — Machine-readable verdict + reasons
   - `guardian-report.html` — Human-readable report with screenshots

If verdict is **FRICTION** or **DO_NOT_LAUNCH**, the pipeline blocks. Fix the site, commit, and re-push.

---

## Success Criteria

✓ Guardian runs on every PR/push  
✓ Deployment blocks if verdict is DO_NOT_LAUNCH  
✓ Team can see decision.json and HTML report  
✓ Failure reasons are clear

---

## Next Steps

- Read [Quickstart: Guardian in GitHub Actions](../../docs/quickstart/CI_GITHUB_ACTION.md) for full reference
- For local testing, use `guardian reality --url https://your-site.com`
- Customize the preset based on your site type
