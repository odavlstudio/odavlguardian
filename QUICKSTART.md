# Guardian Quickstart (5 Minutes)

Guardian scans your site for reality breaks and silent regressions.
One command:

```bash
npx guardian scan https://example.com --preset landing
```

What happens:
- Discovers pages (light crawl)
- Runs curated attempts and intent flows
- Auto-creates a baseline on first run
- Compares future runs against baseline
- Checks intelligence + visual regressions
- Saves reports to `artifacts/<market-run-*>/`

Interpret results:
- ✅ PASSED: No blockers
- ⚠️ WARN: Risks present (fix soon)
- ❌ FAIL: Regression or policy violation (block release)

Next:
- See full CLI reference: `docs/guardian/CLI_REFERENCE.md`
- Learn to read reports: `docs/guardian/HOW_TO_READ_REPORT.md`
- When blocked: `docs/guardian/WHEN_GUARDIAN_BLOCKS.md`
