export const metadata = {
  title: "Guardian Contract v1 - Guardian",
  description: "Guardian specification and guarantees",
};

export default function Contract() {
  return (
    <div>
      <h1>Guardian Contract v1</h1>

      <p>
        The Guardian Contract defines the specification, guarantees, and behavior of ODAVL Guardian.
      </p>

      <h2>Overview</h2>

      <p>Guardian is a headless browser-based reality testing engine that:</p>

      <ul>
        <li>Launches a real Chromium browser to visit your site</li>
        <li>Attempts critical user flows (navigation, forms, journeys)</li>
        <li>Collects evidence (screenshots, logs, reports, traces)</li>
        <li>Computes coverage and behavioral metrics</li>
        <li>Issues a final verdict: READY, FRICTION, or DO_NOT_LAUNCH</li>
      </ul>

      <h2>Verdicts</h2>

      <p>Guardian issues exactly three verdicts:</p>

      <h3>READY (Exit Code 0)</h3>
      <p>Site is acceptable for launch given the evidence and confidence model.</p>

      <h3>FRICTION (Exit Code 1)</h3>
      <p>Users will struggle with key flows or encounter significant friction.</p>

      <h3>DO_NOT_LAUNCH (Exit Code 2)</h3>
      <p>Critical failures block the user journey. Do not launch.</p>

      <h2>Confidence Model</h2>

      <p>Guardian confidence is computed from two dimensions:</p>

      <h3>Coverage Confidence</h3>
      <ul>
        <li><strong>HIGH:</strong> Deep exploration of 10+ pages with varied interactions</li>
        <li><strong>MEDIUM:</strong> Moderate coverage (5–9 pages)</li>
        <li><strong>LOW:</strong> Limited coverage (fewer than 5 pages)</li>
      </ul>

      <h3>Behavioral Confidence</h3>
      <ul>
        <li><strong>HIGH:</strong> No critical runtime instability (no crashes, 5xx errors, navigation failures)</li>
        <li><strong>MEDIUM:</strong> Minor issues (4xx, console warnings) without critical failures</li>
        <li><strong>LOW:</strong> Critical instability (unhandled errors, navigation failures, server 5xx)</li>
      </ul>

      <h3>Overall Confidence</h3>
      <p>Resolved from coverage and behavioral confidence:</p>

      <ul>
        <li>
          <strong>HIGH:</strong> Sufficient coverage OR successful flow execution with no critical errors
        </li>
        <li>
          <strong>MEDIUM:</strong> Limited coverage BUT clean behavior (no critical failures)
        </li>
        <li>
          <strong>LOW:</strong> Insufficient coverage AND/OR unstable behavior
        </li>
      </ul>

      <h2>Evidence & Artifacts</h2>

      <p>Each run produces artifacts for verifiability:</p>

      <ul>
        <li><code>decision.json</code> — Structured verdict and findings (machine-readable)</li>
        <li><code>summary.md</code> — Human-readable summary</li>
        <li><code>market-report.html</code> — Full interactive report with screenshots and analysis</li>
        <li><code>META.json</code> — Run metadata (timing, coverage, attempts, policy mode)</li>
        <li>Screenshots — Visual evidence of each page visited</li>
      </ul>

      <h2>Presets</h2>

      <p>Guardian includes four built-in presets for different risk tolerances:</p>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Preset</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>For</th>
            <th style={{ textAlign: "left", padding: "0.75rem" }}>Fail On</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>startup</td>
            <td style={{ padding: "0.75rem" }}>MVPs, early stage</td>
            <td style={{ padding: "0.75rem" }}>CRITICAL only</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>saas</td>
            <td style={{ padding: "0.75rem" }}>User accounts, data</td>
            <td style={{ padding: "0.75rem" }}>CRITICAL + 1+ WARNING</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>enterprise</td>
            <td style={{ padding: "0.75rem" }}>Compliance, sensitive data</td>
            <td style={{ padding: "0.75rem" }}>Any WARNING</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>landing-demo</td>
            <td style={{ padding: "0.75rem" }}>Marketing pages</td>
            <td style={{ padding: "0.75rem" }}>CRITICAL only</td>
          </tr>
        </tbody>
      </table>

      <h2>Determinism & Stability</h2>

      <p>Guardian is designed to be deterministic and stable:</p>

      <ul>
        <li>
          <strong>Reproducible:</strong> Same site + same preset = same verdict (barring transient network issues)
        </li>
        <li>
          <strong>Explicit:</strong> No hidden logic. All rules are documented.
        </li>
        <li>
          <strong>Traceable:</strong> Every decision is backed by evidence artifacts.
        </li>
        <li>
          <strong>No false negatives:</strong> If Guardian says READY, the core flows work.
        </li>
      </ul>

      <h2>Requirements</h2>

      <ul>
        <li>Node.js 18.0.0+</li>
        <li>200MB disk space for Playwright browsers</li>
        <li>Internet access (to download browsers on first run)</li>
        <li>Target site must be publicly accessible</li>
      </ul>

      <h2>Limitations</h2>

      <p>Guardian has intentional limitations:</p>

      <ul>
        <li><strong>Public flows only:</strong> Cannot test behind login without credentials</li>
        <li><strong>No JavaScript execution context:</strong> Cannot invoke custom JS in user journeys</li>
        <li><strong>No persistent state:</strong> Each run is independent (no session replay)</li>
        <li><strong>Timeout constraints:</strong> Long-running operations may time out</li>
      </ul>

      <h2>Honesty & Silence Discipline</h2>

      <p>Guardian follows "Silence Discipline":</p>

      <ul>
        <li>
          <strong>If READY:</strong> Guardian stays quiet about non-critical findings
        </li>
        <li>
          <strong>If FRICTION or DO_NOT_LAUNCH:</strong> Guardian is very clear with evidence
        </li>
        <li>
          <strong>No false alarms:</strong> Guardian never cries wolf
        </li>
      </ul>

      <h2>Support & Updates</h2>

      <p>Guardian is open source and community-supported:</p>

      <ul>
        <li>Bug reports: <a href="https://github.com/odavlstudio/odavlguardian/issues">GitHub Issues</a></li>
        <li>Discussions: <a href="https://github.com/odavlstudio/odavlguardian/discussions">GitHub Discussions</a></li>
        <li>Source: <a href="https://github.com/odavlstudio/odavlguardian">GitHub Repository</a></li>
      </ul>
    </div>
  );
}
