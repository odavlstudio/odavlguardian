export const metadata = {
  title: "Understanding Verdicts - Guardian",
  description: "What Guardian verdicts mean and how to respond",
};

export default function Verdicts() {
  return (
    <div>
      <h1>Understanding Verdicts</h1>

      <p>
        Guardian gives one of three verdicts after analyzing your website. Each verdict has a clear meaning
        and corresponding exit code for automation.
      </p>

      <h2>🟢 READY (Exit Code 0)</h2>

      <p>
        Your website is safe to launch. Guardian found no critical issues blocking user success.
      </p>

      <p>
        <strong>What it means:</strong>
      </p>
      <ul>
        <li>Core user flows work correctly</li>
        <li>No unhandled errors or crashes</li>
        <li>Essential pages are accessible</li>
        <li>Navigation is functional</li>
      </ul>

      <p>
        <strong>What to do:</strong>
      </p>
      <ul>
        <li>✅ Safe to ship</li>
        <li>Optional: Address any WARNINGs or INFOs for polish</li>
        <li>Optional: Set up CI/CD to catch regressions</li>
      </ul>

      <h2>🟡 FRICTION (Exit Code 1)</h2>

      <p>
        Users will struggle with key flows. The site works, but users will encounter friction, confusion, or
        workarounds.
      </p>

      <p>
        <strong>What it means:</strong>
      </p>
      <ul>
        <li>Some user journeys are blocked or confusing</li>
        <li>UX issues that users will complain about</li>
        <li>Non-critical features are broken</li>
        <li>Significant warnings that affect confidence</li>
      </ul>

      <p>
        <strong>What to do:</strong>
      </p>
      <ul>
        <li>🔧 Fix the issues Guardian identified</li>
        <li>🧪 Re-run Guardian to confirm the fixes</li>
        <li>📋 Review the detailed report for impact</li>
        <li>⏸️ Consider delaying launch until resolved</li>
      </ul>

      <h2>🔴 DO_NOT_LAUNCH (Exit Code 2)</h2>

      <p>
        Critical issues block the user journey. The site will fail for users. Do not launch.
      </p>

      <p>
        <strong>What it means:</strong>
      </p>
      <ul>
        <li>Core user journeys cannot be completed</li>
        <li>Server-side errors (5xx) are occurring</li>
        <li>Essential pages are down or unreachable</li>
        <li>Critical data flows are broken</li>
        <li>Required evidence is missing</li>
      </ul>

      <p>
        <strong>What to do:</strong>
      </p>
      <ul>
        <li>🛑 Stop. Do not launch.</li>
        <li>🔍 Review the Guardian report in detail</li>
        <li>🧯 Fix CRITICAL issues immediately</li>
        <li>🧪 Re-run Guardian to confirm all blockers are resolved</li>
        <li>📊 Only proceed after Guardian gives READY or FRICTION</li>
      </ul>

      <h2>Confidence Levels</h2>

      <p>
        Each verdict includes a <strong>confidence</strong> score indicating how certain Guardian is about the verdict.
      </p>

      <h3>HIGH Confidence</h3>
      <p>
        Guardian tested enough of your site and found stable, consistent behavior. The verdict is reliable.
      </p>

      <h3>MEDIUM Confidence</h3>
      <p>
        Guardian found mixed signals or limited coverage. The verdict is likely correct, but verify key flows
        manually.
      </p>

      <h3>LOW Confidence</h3>
      <p>
        Guardian had trouble testing your site (blocked by auth, timeouts, etc.). Run again or test manually.
      </p>

      <h2>Coverage & Attempts</h2>

      <p>
        Guardian reports how much of your site it tested:
      </p>

      <ul>
        <li>
          <strong>Coverage:</strong> % of discovered pages Guardian visited (e.g., "92% coverage")
        </li>
        <li>
          <strong>Attempts:</strong> How many times Guardian tried key flows (retries for transient failures)
        </li>
      </ul>

      <p>
        If coverage is low, Guardian may have missed issues. Consider:
      </p>
      <ul>
        <li>Is your site public and accessible?</li>
        <li>Are key pages linked from the homepage?</li>
        <li>Do you have authentication? (Guardian tests public flows only)</li>
      </ul>

      <h2>Making Decisions</h2>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Verdict</th>
            <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Confidence</th>
            <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Launch?</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>READY</td>
            <td style={{ padding: "0.75rem" }}>HIGH</td>
            <td style={{ padding: "0.75rem" }}>✅ Yes</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>READY</td>
            <td style={{ padding: "0.75rem" }}>MEDIUM</td>
            <td style={{ padding: "0.75rem" }}>✅ Yes (verify key flows)</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>FRICTION</td>
            <td style={{ padding: "0.75rem" }}>Any</td>
            <td style={{ padding: "0.75rem" }}>⚠️ Fix issues first</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>DO_NOT_LAUNCH</td>
            <td style={{ padding: "0.75rem" }}>Any</td>
            <td style={{ padding: "0.75rem" }}>🛑 No. Fix blockers.</td>
          </tr>
        </tbody>
      </table>

      <h2>Next Steps</h2>
      <ul>
        <li>Run <a href="/docs/first-run">your first check</a></li>
        <li>Set up <a href="/docs/ci-cd">CI/CD automation</a> to catch regressions</li>
        <li>Review the <a href="/report/sample">sample report</a> to understand Guardian output</li>
      </ul>
    </div>
  );
}
