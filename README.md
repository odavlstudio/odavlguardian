# 🛡️ ODAVL Guardian

[![Tier-1 Proof (Level 2)](https://github.com/odavlstudio/odavlguardian/actions/workflows/tier1-proof.yml/badge.svg)](https://github.com/odavlstudio/odavlguardian/actions/workflows/tier1-proof.yml)

The Human Reality Check Before You Launch

Guardian does not test code.
Guardian tests reality — like a real human would.

Most products don't fail because of bad code.
They fail because something breaks in the real user journey — after it's already too late.

ODAVL Guardian is a virtual human
that visits your website, tries to use it,
and tells you what will actually happen to your users.

Before they discover it themselves.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Quick Start (Level 1 — Golden Path)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
# Level 1 Reality Check
guardian --url https://example.com

# Equivalent
guardian reality --url https://example.com
```

Outputs (always saved under ./.odavlguardian/<run>/):
- decision.json — contains `finalVerdict` (READY | FRICTION | DO_NOT_LAUNCH), `exitCode` (0 | 1 | 2), and explanation
- summary.md — human-readable summary
- META.json — run metadata with `result` (PASSED | WARN | FAILED | PENDING) and attempt counts

Canonical verdicts (everywhere):
- READY — Safe to proceed
- FRICTION — Users will struggle
- DO_NOT_LAUNCH — Users will fail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 What You Get (Evidence)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each run produces:

- **summary.md** — human-readable report
- **decision.json** — structured verdict with key findings
- **market-report.html** — full evidence and intelligence
- **screenshots & traces** — visual proof

Everything is local, inspectable, and auditable.
Artifacts saved to: `.odavlguardian/`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ How Guardian Works (Mental Model)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Observe**
Guardian discovers real entry points like a human.

**Attempt**
It tries actions humans try: navigation, forms, flows.

**Verify**
It checks if the goal was actually achieved.

**Decide**
Guardian gives a clear verdict — backed by evidence.

No assumptions.
No simulated success.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 When You Should Use Guardian
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use Guardian before:

- a production deploy
- a public launch
- sending a link to investors
- running paid ads
- announcing a feature

If failure would be embarrassing or expensive —
Guardian belongs there.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Guardian's Philosophy: Silence Discipline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Guardian speaks only when it matters.

If everything is fine → it stays quiet

If users will fail → it is very clear

This is intentional.

Confidence comes from signal, not noise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 Who Guardian Is For
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Founders who fear silent failure

Developers who want truth before deploy

Teams who don't want users to be testers

If you care about what really happens,
Guardian is built for you.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Public Preview

CLI-first

GitHub distribution

Local & privacy-first

Guardian is already useful.
It will only become sharper.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧭 What Comes Next
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Full Documentation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Topic | Link | For... |
|-------|------|--------|
| **Getting Started** | [docs/guardian/getting-started.md](docs/guardian/getting-started.md) | First-time users |
| **CLI Reference** | [guardian --help](bin/guardian.js) | All commands and flags |
| **Presets & Flows** | [docs/guardian/presets.md](docs/guardian/presets.md) | Custom checks and user journeys |
| **CI/CD Integration** | [docs/guardian/ci-integration.md](docs/guardian/ci-integration.md) | GitHub, GitLab, Bitbucket setup |
| **Contract (MVP)** | [docs/guardian/guardian-contract-v1.md](docs/guardian/guardian-contract-v1.md) | Specification & guarantees |
| **Sample Report** | [website/app/report/sample/page.tsx](website/app/report/sample/page.tsx) | Uses in-repo sample artifacts under website/public/sample-artifacts |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 CI/CD Templates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready-to-use templates for continuous integration:

- **GitHub Actions** — [.github/workflows/guardian-pr-gate.yml](.github/workflows/guardian-pr-gate.yml)
- **GitLab CI** — [.gitlab-ci.yml](.gitlab-ci.yml)
- **Bitbucket Pipelines** — [bitbucket-pipelines.yml](bitbucket-pipelines.yml)

See [CI/CD Integration Guide](docs/guardian/ci-integration.md) for setup instructions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deeper journey intelligence

Better failure classification

Stronger confidence signals

But the core will never change:

Guardian exists to test reality — not illusions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ License
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MIT — use it, inspect it, trust it.
