# 🛡️ ODAVL Guardian

![Release](https://img.shields.io/github/v/release/odavlstudio/odavlguardian?label=release&color=blue)
![Reality Based](https://img.shields.io/badge/reality--based-verified-informational)
![Results](https://img.shields.io/badge/results-READY%20%7C%20FRICTION%20%7C%20DO__NOT__LAUNCH-orange)
![Status](https://img.shields.io/badge/status-stable-green)
![Tests](https://github.com/odavlstudio/odavlguardian/actions/workflows/guardian.yml/badge.svg)

## What Guardian Does

Guardian tests your website the way users actually use it.

It opens a real browser, navigates your flows, and tells you if they work—before your users find the problems.

```bash
# Test your site in one command
guardian reality --url https://your-site.com

# Get a verdict
# Artifact: decision.json (verdict + triggered rules)
# Artifact: summary.md (human-readable explanation)
```

That's it.

## Why It Exists

Tests pass. Metrics look good. Code is clean.

And users still fail.

Guardian finds these breaks before they become support tickets.

## The Golden Command

```bash
npm install -g @odavl/guardian

guardian reality --url https://example.com
```

Guardian produces:

```
✅ Verdict: READY (exit code 0)

Artifacts:
  - .odavlguardian/<timestamp>/decision.json
  - .odavlguardian/<timestamp>/summary.md
```

## What You Get

### decision.json (Machine-Readable)

```json
{
  "finalVerdict": "READY",
  "exitCode": 0,
  "triggeredRules": ["all_goals_reached"],
  "reasons": [
    {
      "ruleId": "all_goals_reached",
      "message": "All critical flows executed successfully and goals reached",
      "category": "COMPLIANCE",
      "priority": 50
    }
  ],
  "policySignals": {
    "executedCount": 1,
    "failedCount": 0,
    "goalReached": true,
    "domain": "example.com"
  }
}
```

### summary.md (Human-Readable)

Human-friendly explanation of the verdict, what was tested, what Guardian couldn't confirm, and why.

## The Three Verdicts

- **READY** (exit 0) — Goal reached, no failures
- **FRICTION** (exit 1) — Partial success, warnings, or near-misses
- **DO_NOT_LAUNCH** (exit 2) — User failed or flow broken

Guardian never pretends success.

## What Guardian Does (Conceptually)

1. **You define a scenario** — signup, checkout, landing, etc.
2. **Guardian executes it** — real navigation, real waits, real interactions
3. **Guardian evaluates** — did the human succeed?
4. **Guardian produces a decision** — not logs, a verdict

## When to Use Guardian

- **Before launch** — Does signup actually work?
- **Before scaling** — Does checkout really finish?
- **Before campaigns** — Does the landing convert?
- **Before localization** — Does language switching work?
- **Before deployment** — Did this change break the flow?

## How It Works

Guardian uses a **rules engine** to evaluate reality:

1. Scan results → Policy signals (execution counts, outcomes, etc.)
2. Policy signals → Rules evaluation (deterministic, transparent)
3. Rules → Final verdict (READY | FRICTION | DO_NOT_LAUNCH)

**All rules are explicit.** No ML. No guessing. Transparency by design.

## What Guardian Is NOT

Guardian is not:

- A unit test framework
- A code quality tool
- A performance benchmark
- A security scanner
- A Lighthouse replacement

Guardian complements those tools.

## Philosophy

ODAVL Guardian follows strict principles:

- **No hallucination** — Only what Guardian observed
- **No fake success** — Honest verdicts always
- **No optimistic assumptions** — Conservative by default
- **No silent failures** — If reality is broken, Guardian says so
- **Evidence > explanation** — Verdicts are data-driven
- **Reality > implementation** — What users experience matters most

## Install

```bash
npm install -g @odavl/guardian
```

## Quick Start

```bash
# Test a website
guardian reality --url https://example.com

# Test with a preset (startup, custom, landing, full)
guardian reality --url https://example.com --preset startup

# See all options
guardian --help
```

## VS Code Integration

Command Palette → "Guardian: Run Reality Check"

## Status

**Early but real.** Opinionated. Built with honesty over hype.

This is a foundation — not a marketing shell.

## License

MIT

---

Built with the belief that users matter more than code.
