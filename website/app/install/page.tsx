"use client";

import Link from "next/link";
import GlowBackdrop from "../../components/GlowBackdrop";

export default function InstallPage() {
  return (
    <main className="container">
      <GlowBackdrop className="glow" />

      <section className="section-shell" aria-labelledby="install-head">
        <h1 className="section-title" id="install-head">Install Guardian</h1>
        <p className="trust-head">Get up and running in seconds.</p>

        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          {/* Quick Install */}
          <article className="glass-card p-6" style={{ marginBottom: "2rem" }}>
            <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem" }}>🚀 Quick Install</h2>

            <h3 style={{ margin: "1rem 0 0.75rem", fontSize: "1.125rem" }}>Global Installation (Recommended)</h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
              Install Guardian globally so you can use it anywhere:
            </p>
            <code
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "0.75rem",
                borderRadius: "8px",
                display: "block",
                fontFamily: "Monaco, monospace",
                fontSize: "0.9rem",
                overflow: "auto",
                marginBottom: "1.5rem",
                userSelect: "all",
              }}
            >
              npm install -g @odavl/guardian
            </code>

            <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1.125rem" }}>Verify Installation</h3>
            <code
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "0.75rem",
                borderRadius: "8px",
                display: "block",
                fontFamily: "Monaco, monospace",
                fontSize: "0.9rem",
                overflow: "auto",
              }}
            >
              guardian --version
            </code>
          </article>

          {/* First Run */}
          <article className="glass-card p-6" style={{ marginBottom: "2rem" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem" }}>⚡ Your First Check</h2>

            <code
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "0.75rem",
                borderRadius: "8px",
                display: "block",
                fontFamily: "Monaco, monospace",
                fontSize: "0.9rem",
                overflow: "auto",
                marginBottom: "1.5rem",
                userSelect: "all",
              }}
            >
              guardian --url https://example.com
            </code>

            <p style={{ margin: "0", fontSize: "0.9rem", color: "var(--muted)" }}>
              Replace <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>https://example.com</code> with your site.
            </p>
          </article>

          {/* Requirements */}
          <article className="glass-card p-6" style={{ marginBottom: "2rem" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem" }}>✅ System Requirements</h2>

            <ul style={{ margin: "0", paddingLeft: "1.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              <li><strong>Node.js:</strong> 18.0.0 or higher</li>
              <li><strong>npm:</strong> 9.0.0 or higher</li>
              <li><strong>Disk space:</strong> 200MB (for Playwright browsers)</li>
              <li><strong>OS:</strong> macOS, Linux, Windows (WSL recommended)</li>
            </ul>

            <p style={{ margin: "1.5rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
              Check your versions: <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>node --version && npm --version</code>
            </p>
          </article>

          {/* Alternative Installs */}
          <article className="glass-card p-6" style={{ marginBottom: "2rem" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem" }}>🔄 Alternative Installs</h2>

            <h3 style={{ margin: "1rem 0 0.75rem", fontSize: "1.125rem" }}>Using npx (No Installation)</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--muted)" }}>
              Run Guardian without installing it globally:
            </p>
            <code
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "0.75rem",
                borderRadius: "8px",
                display: "block",
                fontFamily: "Monaco, monospace",
                fontSize: "0.9rem",
                overflow: "auto",
                marginBottom: "1.5rem",
                userSelect: "all",
              }}
            >
              npx @odavl/guardian --url https://example.com
            </code>

            <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1.125rem" }}>Local Project Installation</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--muted)" }}>
              Install as a dev dependency in your project:
            </p>
            <code
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "0.75rem",
                borderRadius: "8px",
                display: "block",
                fontFamily: "Monaco, monospace",
                fontSize: "0.9rem",
                overflow: "auto",
                marginBottom: "0.75rem",
                userSelect: "all",
              }}
            >
              npm install --save-dev @odavl/guardian
            </code>
            <p style={{ margin: "0", fontSize: "0.9rem", color: "var(--muted)" }}>
              Then run: <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>npx guardian --url ...</code>
            </p>
          </article>

          {/* Next Steps */}
          <article
            className="glass-card p-6"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))",
              marginBottom: "2rem",
            }}
          >
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem" }}>🎯 Next Steps</h2>

            <ul style={{ margin: "0", paddingLeft: "1.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              <li>
                <Link href="/docs" style={{ color: "var(--glow-2)", textDecoration: "underline" }}>
                  Read the Getting Started Guide
                </Link>
              </li>
              <li>
                <Link href="/report/sample" style={{ color: "var(--glow-2)", textDecoration: "underline" }}>
                  View a sample report
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/odavlstudio/odavlguardian"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--glow-2)", textDecoration: "underline" }}
                >
                  View on GitHub
                </a>
              </li>
            </ul>
          </article>

          <Link href="/" className="btn btn-secondary" aria-label="Back to home">
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
