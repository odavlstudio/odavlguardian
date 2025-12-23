# Guardian CLI Reference

## Commands

- `guardian scan <url>`
  - One-command product scan. Runs discovery, auto-attempts, intent flows, baseline compare, intelligence + visual checks.
  - Options:
    - `--preset <landing|saas|shop>` Opinionated defaults
    - `--policy <path|preset:name>` Override policy
    - `--artifacts <dir>` Artifacts directory
    - `--headful` Headed browser
    - `--no-trace`, `--no-screenshots`

- `guardian reality --url <baseUrl>`
  - Full Market Reality Snapshot with configurable options.

- `guardian protect <url>`
  - Shortcut for `reality` with startup policy.

- `guardian attempt --url <baseUrl> --attempt <id>`
  - Run a single curated attempt.

- `guardian baseline save|check` (legacy)

- `guardian presets`
  - List available policy presets.

## Presets (Scan)

Deterministic mappings used by `scan`:

- `landing`
  - Attempts: `contact_form`, `language_switch`, `newsletter_signup`
  - Flows: none
  - Policy: fail on CRITICAL, allow warnings, visual gates max 25%

- `saas`
  - Attempts: `language_switch`, `contact_form`, `newsletter_signup`
  - Flows: `signup_flow`, `login_flow`
  - Policy: fail on CRITICAL, warnings ≤ 1, visual gates max 20%

- `shop`
  - Attempts: `language_switch`, `contact_form`, `newsletter_signup`
  - Flows: `checkout_flow`
  - Policy: fail on CRITICAL, warnings 0, visual gates max 15%

## Output

- CLI Summary:
  - Overall verdict
  - Top 3 issues
  - Business impact
  - Report path

- Artifacts:
  - `artifacts/<market-run-*>/snapshot.json`
  - `artifacts/<market-run-*>/report.html` (enhanced)
  - Per-attempt and flow directories
