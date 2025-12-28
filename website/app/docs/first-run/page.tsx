export const metadata = {
  title: "Your First Run - Guardian",
  description: "Run Guardian for the first time and understand the output",
};

export default function FirstRun() {
  return (
    <div>
      <h1>Your First Run</h1>

      <h2>Step 1: Run Guardian</h2>
      <p>Open your terminal and run:</p>
      <pre><code>guardian --url https://example.com</code></pre>

      <p>Replace <code>https://example.com</code> with your website.</p>

      <h2>Step 2: Watch the Progress</h2>
      <p>Guardian will:</p>
      <ul>
        <li>Open a real Chromium browser</li>
        <li>Visit your website and try critical user flows</li>
        <li>Collect screenshots, logs, and network data</li>
        <li>Analyze findings and compute a verdict</li>
      </ul>

      <p>This typically takes 30–60 seconds depending on your site's speed.</p>

      <h2>Step 3: Read the Verdict</h2>
      <p>
        Guardian prints a clear, human-readable summary to your terminal. Look for the
        <strong> final verdict</strong>:
      </p>

      <ul>
        <li>
          <strong>🟢 READY</strong> — Your site is safe for launch
        </li>
        <li>
          <strong>🟡 FRICTION</strong> — Users will struggle with key flows
        </li>
        <li>
          <strong>🔴 DO_NOT_LAUNCH</strong> — Critical issues block the user journey
        </li>
      </ul>

      <h2>Step 4: Inspect the Report</h2>
      <p>
        Guardian saves detailed artifacts to <code>./.odavlguardian/&lt;timestamp&gt;_&lt;domain&gt;/</code>
      </p>

      <p>Open the report file:</p>
      <pre><code>open ./.odavlguardian/latest/market-report.html</code></pre>

      <p>On Windows/PowerShell:</p>
      <pre><code>Start-Process .\.odavlguardian\latest\market-report.html</code></pre>

      <p>The report includes:</p>
      <ul>
        <li>Screenshots of each page visited</li>
        <li>Issues found (broken links, missing elements, errors)</li>
        <li>Severity levels (CRITICAL, WARNING, INFO)</li>
        <li>Coverage metrics</li>
        <li>Recommendations for fixes</li>
      </ul>

      <h2>Step 5: Fix Issues</h2>
      <p>
        If Guardian found issues, the report prioritizes them by severity. Start with CRITICAL issues.
      </p>

      <p>After fixing, run Guardian again to verify:</p>
      <pre><code>guardian --url https://example.com</code></pre>

      <h2>Understanding the Output Files</h2>

      <h3>decision.json</h3>
      <p>Machine-readable verdict and findings:</p>
      <pre><code>{`{
  "finalVerdict": "READY",
  "exitCode": 0,
  "coverage": { "executed": 12, "total": 13, "coveragePercent": 92 },
  "confidence": {
    "level": "HIGH",
    "coverage": 92,
    "behavioral": "HIGH",
    "reasoning": "..."
  },
  "findings": {
    "critical": 0,
    "warnings": 2,
    "info": 5
  }
}`}</code></pre>

      <h3>summary.md</h3>
      <p>Human-readable markdown summary of the check. Great for sharing with your team.</p>

      <h3>META.json</h3>
      <p>Run metadata including timing, attempt counts, and policy mode.</p>

      <h2>Next Steps</h2>
      <ul>
        <li>Learn about <a href="/docs/presets">Presets</a> to customize checks</li>
        <li>Set up <a href="/docs/ci-cd">CI/CD integration</a> to run automatically on every deploy</li>
        <li>View the <a href="/report/sample">sample report</a> to see what Guardian output looks like</li>
      </ul>
    </div>
  );
}
