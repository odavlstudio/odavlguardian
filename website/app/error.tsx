"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="shell section">
      <h2>Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred."}</p>
    </div>
  );
}
