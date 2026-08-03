"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManageLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setLocked(true);
        setError(
          `Too many attempts. Try again after ${
            data.lockedUntil
              ? new Date(data.lockedUntil).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
              : "15 minutes"
          }.`
        );
        return;
      }

      if (!res.ok) {
        const remaining = data.remainingAttempts;
        setError(
          `Invalid credentials.${remaining !== undefined ? ` ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` : ""}`
        );
        setPin("");
        return;
      }

      // Success — go to stock page
      router.push("/manage/stock");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "#166534",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png?v=6" alt="PPR Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Admin Access</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
            P.P.R. Fruits and Vegetables
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="admin-phone"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "6px" }}
            >
              Phone number
            </label>
            <input
              id="admin-phone"
              type="tel"
              inputMode="numeric"
              className="admin-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"

              autoComplete="username"
              required
              disabled={locked}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="admin-pin"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "6px" }}
            >
              PIN
            </label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              className="admin-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              autoComplete="current-password"
              maxLength={8}
              required
              disabled={locked}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "16px",
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
            className="btn-accent"
            id="admin-login-btn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading || locked}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
