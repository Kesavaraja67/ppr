"use client";

import { useEffect } from "react";

/**
 * global-error.tsx — catches errors that escape the root layout,
 * including errors in layout.tsx itself.
 * Must include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(observability): forward error + digest to Sentry/logging service
    console.error("[GlobalError]", error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f8faf8",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
          textAlign: "center",
          gap: "12px",
        }}
      >
        <div style={{ marginBottom: "8px", color: "#dc2626" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "4px",
          }}
        >
          Critical error
        </h1>
        <p
          style={{
            fontSize: "0.88rem",
            color: "#666",
            maxWidth: "320px",
            lineHeight: 1.5,
          }}
        >
          A critical error occurred in the application. Please refresh the page
          — if the problem continues, contact the shop.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.72rem", color: "#999", marginTop: "4px" }}>
            Error reference: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: "16px",
            padding: "12px 28px",
            background: "#1A6B47",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Refresh
        </button>
      </body>
    </html>
  );
}
