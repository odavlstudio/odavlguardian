export const metadata = {
  title: "Presets & Policies - Guardian",
  description: "Choose the right preset for your product",
};

export default function Presets() {
  return (
    <div>
      <h1>Presets & Policies</h1>

      <p>
        Guardian includes four built-in presets optimized for different product types and risk tolerances.
      </p>

      <h2>Startup Preset</h2>
      <p>
        <strong>For:</strong> Early-stage products, MVPs, landing pages, rapid iteration
      </p>

      <pre><code>guardian --url https://example.com --preset startup</code></pre>

      <p>
        <strong>What it checks:</strong>
      </p>
      <ul>
        <li>Core navigation works</li>
        <li>Primary CTAs are reachable</li>
        <li>No catastrophic failures (5xx, page crashes)</li>
        <li>Basic SEO elements present</li>
      </ul>

      <p>
        <strong>Failure criteria:</strong> Any CRITICAL issue → FAIL
      </p>

      <p>
        <strong>Philosophy:</strong> Move fast. Catch only the show-stoppers.
      </p>

      <h2>SaaS Preset</h2>
      <p>
        <strong>For:</strong> SaaS products with user accounts, apps with signup/login, data-critical flows
      </p>

      <pre><code>guardian --url https://my-saas.com --preset saas</code></pre>

      <p>
        <strong>What it checks:</strong>
      </p>
      <ul>
        <li>All startup checks</li>
        <li>Signup flow (if present)</li>
        <li>Login flow (if present)</li>
        <li>Dashboard access</li>
        <li>Core user journeys</li>
      </ul>

      <p>
        <strong>Failure criteria:</strong> CRITICAL issue OR more than 1 WARNING
      </p>

      <p>
        <strong>Philosophy:</strong> Users trust you with their data. Higher bar for safety.
      </p>

      <h2>Enterprise Preset</h2>
      <p>
        <strong>For:</strong> Large organizations, compliance-heavy products, sensitive data handling
      </p>

      <pre><code>guardian --url https://enterprise.example.com --preset enterprise</code></pre>

      <p>
        <strong>What it checks:</strong>
      </p>
      <ul>
        <li>All SaaS checks</li>
        <li>Accessibility compliance (WCAG)</li>
        <li>Security headers present</li>
        <li>Privacy policy linked and readable</li>
        <li>Data handling best practices</li>
      </ul>

      <p>
        <strong>Failure criteria:</strong> Any WARNING → FAIL
      </p>

      <p>
        <strong>Philosophy:</strong> Compliance first. Zero tolerance for missed requirements.
      </p>

      <h2>Landing-Demo Preset</h2>
      <p>
        <strong>For:</strong> Landing pages, demo sites, marketing pages with no user data
      </p>

      <pre><code>guardian --url https://demo.example.com --preset landing-demo</code></pre>

      <p>
        <strong>What it checks:</strong>
      </p>
      <ul>
        <li>Basic page load and navigation</li>
        <li>Critical CTAs visible and clickable</li>
        <li>No obvious layout breaks</li>
      </ul>

      <p>
        <strong>Failure criteria:</strong> CRITICAL issue only
      </p>

      <p>
        <strong>Philosophy:</strong> Permissive. Only catch obvious blockers.
      </p>

      <h2>Choosing Your Preset</h2>

      <table style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Preset</th>
            <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Best For</th>
            <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Risk Tolerance</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>startup</td>
            <td style={{ padding: "0.75rem" }}>MVPs, early stage</td>
            <td style={{ padding: "0.75rem" }}>High</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>saas</td>
            <td style={{ padding: "0.75rem" }}>User accounts, data</td>
            <td style={{ padding: "0.75rem" }}>Medium</td>
          </tr>
          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <td style={{ padding: "0.75rem" }}>enterprise</td>
            <td style={{ padding: "0.75rem" }}>Compliance, sensitive data</td>
            <td style={{ padding: "0.75rem" }}>Low</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem" }}>landing-demo</td>
            <td style={{ padding: "0.75rem" }}>Marketing pages</td>
            <td style={{ padding: "0.75rem" }}>Very high</td>
          </tr>
        </tbody>
      </table>

      <h2>Next Steps</h2>
      <ul>
        <li>Run your first check with the <strong>startup</strong> preset</li>
        <li>Upgrade to <strong>saas</strong> or <strong>enterprise</strong> as your product matures</li>
        <li>Set up <a href="/docs/ci-cd">CI/CD integration</a> to run automatically</li>
      </ul>
    </div>
  );
}
