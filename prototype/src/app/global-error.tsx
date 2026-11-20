"use client";

// Catches errors thrown by the root layout itself (e.g. the database isn't migrated yet).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", textAlign: "center", color: "#0f172a" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>SplitSmart couldn&apos;t start</h1>
        <p style={{ marginTop: "0.5rem", color: "#475569", fontSize: "0.9rem" }}>
          The database may not be set up. In the <code>prototype/</code> folder run <code>npm run db:setup</code>, then
          reload.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1.25rem", padding: "0.5rem 1rem", borderRadius: 8, background: "#0f766e", color: "white", border: 0 }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
