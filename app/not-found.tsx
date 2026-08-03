import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — P.P.R. Fruits & Vegetables",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg)",
        fontFamily: "var(--font)",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div style={{ marginBottom: "8px", color: "#166534" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: "0.88rem",
          color: "var(--text-muted)",
          maxWidth: "300px",
          lineHeight: 1.5,
        }}
      >
        The page you were looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="btn-accent"
        style={{ marginTop: "16px", padding: "12px 28px" }}
      >
        Back to catalog
      </Link>
    </div>
  );
}
