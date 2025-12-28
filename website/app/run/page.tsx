"use client";
export const dynamic = "force-dynamic";
import { useMemo, useState } from "react";
import GlowBackdrop from "../../components/GlowBackdrop";
import Link from "next/link";

type Decision = {
  runId?: string;
  url?: string;
  timestamp?: string;
  finalVerdict?: string;
  exitCode?: number;
  reasons?: { code?: string; message?: string }[];
  confidence?: { level?: string; coverage?: number };
  coverage?: { total?: number; executed?: number; gaps?: number; coveragePercent?: number };
};

type Meta = {
  policy?: string;
  result?: string;
  attempts?: { total?: number; successful?: number; failed?: number; skipped?: number };
  durationMs?: number;
  timestamp?: string;
  url?: string;
};

function verdictColor(verdict?: string) {
  if (!verdict) return "var(--muted)";
  const v = verdict.toUpperCase();
  if (v === "READY") return "#22c55e";
  if (v === "FRICTION") return "#f97316";
  if (v === "DO_NOT_LAUNCH") return "#ef4444";
  return "var(--muted)";
}

function formatDate(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toUTCString();
}

export default function RunPage() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const coverageText = useMemo(() => {
    if (!decision?.coverage) return "";
    const executed = decision.coverage.executed ?? 0;
    const total = decision.coverage.total ?? 0;
    const pct = decision.coverage.coveragePercent ?? (total ? Math.round((executed / total) * 100) : 0);
    return `${executed}/${total} (${pct}%)`;
  }, [decision]);

  const attemptsText = useMemo(() => {
    if (!meta?.attempts) return "";
    const { total = 0, successful = 0, failed = 0, skipped = 0 } = meta.attempts;
    return `${successful} success / ${failed} failed / ${skipped} skipped (of ${total})`;
  }, [meta]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const nextErrors: string[] = [];
    let nextDecision: Decision | null = null;
    let nextMeta: Meta | null = null;
    let nextSummary: string | null = null;

    const readFileText = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsText(file);
      });

    for (const file of Array.from(fileList)) {
      const name = file.name.toLowerCase();
      try {
        if (name === "decision.json") {
          const text = await readFileText(file);
          nextDecision = JSON.parse(text);
        } else if (name === "meta.json" || name === "meta.txt" || name === "meta.yaml" || name === "meta.yml") {
          // meta.json is optional but helpful
          const text = await readFileText(file);
          nextMeta = JSON.parse(text);
        } else if (name.endsWith("summary.md") || name === "summary.txt") {
          nextSummary = await readFileText(file);
        }
      } catch (err: any) {
        nextErrors.push(err?.message || `Unable to parse ${file.name}`);
      }
    }

    if (!nextDecision) {
      nextErrors.push("decision.json is required. Generate it with guardian reality --artifacts <dir> and upload it here.");
    }

    setDecision(nextDecision);
    setMeta(nextMeta);
    setSummary(nextSummary);
    setErrors(nextErrors);
  };

  return (
    <main className="container" style={{ position: "relative" }}>
      <GlowBackdrop className="glow" />

      <section className="hero" aria-labelledby="run-head">
        <h1 id="run-head">Review a real Guardian run</h1>
        <p>Upload your local Guardian artifacts and see the verdict, risks, and coverage instantly.</p>
      </section>

      <section className="section-shell" aria-labelledby="steps-head">
        <p className="section-label">How to generate artifacts</p>
        <h2 className="section-title" id="steps-head">Run locally, then upload decision.json</h2>
        <div className="quick-start-cards">
          <article className="quick-start-card">
            <span className="quick-start-num">1</span>
            <p className="quick-start-title">Run Guardian</p>
            <code className="quick-start-code">npx -y @odavl/guardian reality --url https://example.com --artifacts ./.odavlguardian</code>
          </article>
          <article className="quick-start-card">
            <span className="quick-start-num">2</span>
            <p className="quick-start-title">Find artifacts</p>
            <p style={{ color: "var(--muted)", margin: 0 }}>.odavlguardian/&lt;run&gt;/decision.json (+ META.json, summary.md)</p>
          </article>
          <article className="quick-start-card">
            <span className="quick-start-num">3</span>
            <p className="quick-start-title">Upload files</p>
            <p style={{ color: "var(--muted)", margin: 0 }}>Drop decision.json (and optional META.json, summary.md) below.</p>
          </article>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="upload-head">
        <h2 className="section-title" id="upload-head">Upload your Guardian output</h2>
        <p className="trust-head">We parse the files locally in your browser. Nothing is uploaded to a server.</p>

        <label
          htmlFor="artifact-upload"
          style={{
            border: "1px dashed rgba(255,255,255,0.25)",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "block",
            cursor: "pointer",
            marginBottom: "1rem",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <p style={{ margin: "0 0 0.35rem" }}><strong>Click to choose files</strong> or drag and drop decision.json, META.json, summary.md</p>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>Accepted: decision.json (required), META.json (optional), summary.md/summary.txt (optional)</p>
        </label>
        <input
          id="artifact-upload"
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
          aria-describedby="upload-help"
        />
        <p id="upload-help" style={{ color: "var(--muted)", marginTop: "-0.5rem" }}>Files are processed client-side only.</p>

        {errors.length > 0 && (
          <div className="glass-card p-6" style={{ marginTop: "1rem", border: "1px solid #ef4444" }}>
            <p style={{ margin: 0, color: "#ef4444", fontWeight: 600 }}>Issues</p>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", color: "var(--muted)" }}>
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {decision && (
          <div className="glass-card p-6" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 0.25rem", color: "var(--muted)", fontSize: "0.95rem" }}>Run ID</p>
                <h2 style={{ margin: 0 }}>{decision.runId || "(not provided)"}</h2>
                <p style={{ margin: "0.25rem 0", color: "var(--muted)", fontSize: "0.9rem" }}>Target: {decision.url || "(unknown)"}</p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>Timestamp: {formatDate(decision.timestamp)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 0.35rem", color: "var(--muted)" }}>Final verdict</p>
                <span style={{ fontSize: "1.75rem", fontWeight: 700, color: verdictColor(decision.finalVerdict) }}>{decision.finalVerdict || "UNKNOWN"}</span>
                <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>Exit code: {decision.exitCode ?? "n/a"}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1.25rem" }}>
              <article className="glass-card" style={{ padding: "1rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--muted)" }}>Coverage</p>
                <strong style={{ fontSize: "1.25rem" }}>{coverageText || "n/a"}</strong>
              </article>
              <article className="glass-card" style={{ padding: "1rem", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--muted)" }}>Confidence</p>
                <strong style={{ fontSize: "1.25rem" }}>{decision.confidence?.level || "unknown"}</strong>
              </article>
              <article className="glass-card" style={{ padding: "1rem", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--muted)" }}>Attempts</p>
                <strong style={{ fontSize: "1.05rem" }}>{attemptsText || "No META.json uploaded"}</strong>
              </article>
            </div>

            <div className="section-shell" style={{ padding: 0, marginTop: "1rem" }}>
              <div className="glass-card p-6">
                <h3 style={{ margin: "0 0 0.75rem" }}>Reasons</h3>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)" }}>
                  {(decision.reasons || []).map((reason, idx) => (
                    <li key={`${reason.code}-${idx}`} style={{ marginBottom: "0.5rem" }}>
                      <strong style={{ color: "var(--glow-2)" }}>{reason.code}</strong> — {reason.message}
                    </li>
                  ))}
                  {!decision.reasons?.length && <li>No reasons reported.</li>}
                </ul>
              </div>

              {summary && (
                <div className="glass-card p-6" style={{ marginTop: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.5rem" }}>Summary (from summary.md)</h3>
                  <pre
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      padding: "1rem",
                      borderRadius: "8px",
                      overflow: "auto",
                      fontSize: "0.9rem",
                    }}
                  >
                    {summary}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="section-shell" aria-labelledby="sample-head" style={{ marginTop: "1rem" }}>
        <h2 className="section-title" id="sample-head">Don’t have artifacts yet?</h2>
        <p className="trust-head">Use the built-in sample bundle to see a real run.</p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/report/sample" className="btn btn-primary" aria-label="View sample report">View sample report</Link>
          <a className="btn btn-secondary" href="/sample-artifacts.zip" download aria-label="Download sample artifacts">
            Download sample artifacts
          </a>
        </div>
      </section>
    </main>
  );
}
