# When Guardian Blocks a Release — What to Do

Guardian blocks a release when:
- Baseline regressions are detected
- Policy gates fail (visual, domain, severity)
- CRITICAL risks present

## Triage Steps

1. Open the enhanced report
   - Path printed in CLI summary (artifacts/<market-run-*>/)
2. Review Top Issues (first 3)
   - Click evidence screenshots
3. Identify root cause
   - Check affected attempt/flow and failure taxonomy
4. Apply fixes
   - Restore baseline behavior for blocked areas
5. Re-run Guardian
   - Verify: no regressions, policy passes

## Visual Gate Failures

- If visual diff > threshold:
  - Inspect CSS/layout changes
  - Reduce variance or update baseline if approved

## Policy Adjustments (If Needed)

- Temporarily relax WARNING gates (not CRITICAL)
- Document deviations and plan to tighten later

## Keep It Deterministic

- No flaky checks
- Avoid noisy output
- Evidence-driven decisions
