"use client";

export const dynamic = "force-dynamic";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <main className="container" style={{ padding: "4rem 0" }}>
      <section className="section-shell" aria-labelledby="error-head">
        <h1 className="section-title" id="error-head">Something went wrong</h1>
        <p className="trust-head" style={{ marginBottom: "1rem" }}>
          {error?.message || "An unexpected error occurred."}
        </p>
        <button className="btn btn-secondary" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
