import Link from "next/link";
import GlowBackdrop from "../../components/GlowBackdrop";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <main className="container" style={{ position: "relative" }}>
      <GlowBackdrop className="glow" />

      <section className="section-shell" aria-labelledby="terms-head">
        <h1 className="section-title" id="terms-head">Terms of Use</h1>
        <p className="trust-head">
          These are simple, plain-language guidelines for using this site and product.
        </p>
        <div className="glass-card p-6">
          <p>
            Use the site responsibly. Do not attempt to abuse, attack, or
            reverse-engineer the service. We may update features periodically
            and reserve the right to change or remove content.
          </p>
          <p>
            The information here is provided as-is without guarantees.
            For production decisions, validate results and consider your
            specific context.
          </p>
          <p>
            This is not legal advice. If you need legal terms tailored to your
            business, consult a professional.
          </p>
        </div>
        <div className="mt-8">
          <Link href="/" className="btn btn-secondary" aria-label="Back to home">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
