import Link from "next/link";

export default function OrderConfirmedPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "9999px",
          background: "#f0fdf4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.2rem",
          marginBottom: "20px",
        }}
      >
        ✓
      </div>

      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "10px" }}>
        Order Placed!
      </h1>

      <p style={{ color: "#6b7280", fontSize: "0.9rem", maxWidth: "280px", lineHeight: 1.6, marginBottom: "8px" }}>
        Your order is confirmed for <strong>tomorrow&apos;s delivery</strong>.
      </p>

      <p style={{ color: "#6b7280", fontSize: "0.85rem", maxWidth: "280px", lineHeight: 1.6, marginBottom: "28px" }}>
        You can cancel anytime before <strong>10:00 PM today</strong>. The shop will share your bill before delivery.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
        <Link
          href="/orders"
          className="btn-accent"
          style={{ display: "flex", justifyContent: "center" }}
        >
          View my orders
        </Link>
        <Link
          href="/"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "14px",
            border: "1.5px solid #e5e7eb",
            borderRadius: "9999px",
            color: "#6b7280",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Back to catalog
        </Link>
      </div>
    </div>
  );
}
