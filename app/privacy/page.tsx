import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — P.P.R. Fruits & Vegetables",
  description: "How P.P.R. Fruits & Vegetables handles your personal information.",
};

export default function PrivacyPage() {
  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "0 auto",
        padding: "40px 24px 60px",
        fontFamily: "var(--font)",
        color: "var(--text-primary)",
      }}
    >
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--emerald, #1A6B47)",
          fontSize: "0.85rem",
          fontWeight: 500,
          marginBottom: "32px",
          textDecoration: "none",
        }}
      >
        ← Back to catalog
      </Link>

      <h1
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          marginBottom: "8px",
          color: "var(--text-primary)",
        }}
      >
        Privacy Policy
      </h1>
      <p
        style={{
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          marginBottom: "32px",
        }}
      >
        Last updated: August 2026
      </p>

      {[
        {
          heading: "Who we are",
          body: "P.P.R. Fruits & Vegetables is a local produce shop based in Coimbatore, Tamil Nadu, India. This app lets you browse our daily produce list and place home-delivery orders.",
        },
        {
          heading: "What we collect",
          body: "When you create an account or place an order, we collect your mobile phone number and, optionally, your name and delivery address (including GPS coordinates for delivery range verification). We do not collect payment details — orders are pay-on-delivery.",
        },
        {
          heading: "How we use it",
          body: "Your phone number is used solely to verify your identity via one-time password (OTP). Your name and address are used to process and deliver your order. We do not sell, rent, or share your personal data with any third parties, other than MSG91 (our OTP provider) which processes your phone number to send the verification SMS.",
        },
        {
          heading: "OTP verification",
          body: "OTP delivery is powered by MSG91 (msg91.com). When you request an OTP, your mobile number is transmitted to MSG91 solely for the purpose of sending the SMS. MSG91's own privacy policy governs their data handling.",
        },
        {
          heading: "Data retention",
          body: "Your account and order history are retained for as long as you have an account with us. You can request deletion of your data by contacting us at the phone number listed in the app.",
        },
        {
          heading: "Security",
          body: "All data is stored in an encrypted PostgreSQL database hosted on Neon (neon.tech). Connections use TLS/SSL. Session tokens are signed JWTs stored as HttpOnly cookies.",
        },
        {
          heading: "Contact",
          body: "For any privacy questions, please call or WhatsApp the shop number shown on the catalog page.",
        },
      ].map(({ heading, body }) => (
        <section key={heading} style={{ marginBottom: "28px" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--emerald, #1A6B47)",
              marginBottom: "8px",
            }}
          >
            {heading}
          </h2>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.65,
              color: "var(--text-secondary)",
            }}
          >
            {body}
          </p>
        </section>
      ))}
    </div>
  );
}
