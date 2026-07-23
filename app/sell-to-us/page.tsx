"use client";

import { useState } from "react";
import Link from "next/link";

export default function SellToUsPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vegName, setVegName] = useState("");
  const [approxQty, setApproxQty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/sell-to-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, veg_name: vegName, approx_qty: approxQty }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "#166534",
          color: "#fff",
          padding: "24px 16px 20px",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: "0.8rem",
            opacity: 0.8,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "12px",
          }}
        >
          ← Back to shop
        </Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.2 }}>
          Supply to PPR
        </h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.85, marginTop: "6px" }}>
          Are you a farmer or wholesaler? Tell us what you have.
        </p>
      </header>

      <div style={{ padding: "24px 16px" }}>
        {submitted ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 24px",
              background: "#fff",
              borderRadius: "16px",
              border: "1.5px solid #bbf7d0",
            }}
            className="animate-slide-up"
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>
              We received your enquiry
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Jayaraman will call you back on <strong>{phone}</strong> soon.
              Thank you for reaching out.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                marginTop: "24px",
                background: "#166534",
                color: "#fff",
                fontWeight: 700,
                padding: "12px 28px",
                borderRadius: "9999px",
                fontSize: "0.875rem",
              }}
            >
              Back to shop
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="supplier-name" style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                Your name *
              </label>
              <input
                id="supplier-name"
                type="text"
                className="admin-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="supplier-phone" style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                Phone number *
              </label>
              <input
                id="supplier-phone"
                type="tel"
                inputMode="numeric"
                className="admin-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                required
                autoComplete="tel"
              />
            </div>

            <div>
              <label htmlFor="supplier-veg" style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                What do you supply? *
              </label>
              <input
                id="supplier-veg"
                type="text"
                className="admin-input"
                value={vegName}
                onChange={(e) => setVegName(e.target.value)}
                placeholder="e.g. Tomatoes, Okra, Mixed leafy greens"
                required
              />
            </div>

            <div>
              <label htmlFor="supplier-qty" style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                Approximate quantity (optional)
              </label>
              <input
                id="supplier-qty"
                type="text"
                className="admin-input"
                value={approxQty}
                onChange={(e) => setApproxQty(e.target.value)}
                placeholder="e.g. 50 kg/day, 200 bunches/week"
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "#dc2626",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              id="supplier-submit-btn"
              className="btn-accent"
              style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
            >
              {submitting ? "Submitting…" : "Send enquiry"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
