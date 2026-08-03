"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(observability): forward error + digest to Sentry/logging service
    console.error("[ErrorBoundary]", error.message, error.digest);
  }, [error]);

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
      <div style={{ marginBottom: "8px", color: "#dc2626" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
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
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "0.88rem",
          color: "var(--text-muted)",
          maxWidth: "320px",
          lineHeight: 1.5,
        }}
      >
        An unexpected error occurred. Please try again — if the problem
        persists, contact the shop.
      </p>
      {error.digest && (
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
          Error reference: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button
          className="btn-accent"
          onClick={reset}
          style={{ padding: "12px 24px" }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: "12px 24px",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--font)",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Back to catalog
        </Link>
      </div>
    </div>
  );
}
