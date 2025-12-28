export default function Custom500() {
  return (
    <main className="container" style={{ padding: "4rem 0" }}>
      <section className="section-shell" aria-labelledby="error-head">
        <h1 className="section-title" id="error-head">Server error</h1>
        <p className="trust-head">An unexpected error occurred. Please try again later.</p>
      </section>
    </main>
  );
}
