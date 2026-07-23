export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "#fafaf7",
        textAlign: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          background: "#dcfce7",
          borderRadius: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.9.9 7.1A5 5 0 0 1 12 20z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: "1.3rem",
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: "8px",
        }}
      >
        P.P.R. Fruits and Vegetables
      </h1>

      <p
        style={{
          fontSize: "0.95rem",
          color: "#6b7280",
          marginBottom: "28px",
          lineHeight: 1.6,
          maxWidth: "280px",
        }}
      >
        You&rsquo;re offline right now. Connect to the internet to see today&rsquo;s fresh stock and prices.
      </p>

      <a
        href="tel:8870187248"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#166534",
          color: "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          padding: "14px 28px",
          borderRadius: "9999px",
          textDecoration: "none",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.01 21 3 13.99 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.24 1.02l-2.21 2.2z"/>
        </svg>
        Call 8870187248
      </a>

      <p style={{ marginTop: "16px", fontSize: "0.75rem", color: "#9ca3af" }}>
        Jayaraman P · P.P.R. Fruits and Vegetables
      </p>
    </main>
  );
}
