"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SupplierRequest {
  id: string;
  name: string;
  phone: string;
  veg_name: string;
  approx_qty: string | null;
  created_at: string | null;
  seen: boolean | null;
}

export default function SuppliersPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const unseenCount = requests.filter((r) => !r.seen).length;

  useEffect(() => {
    fetch("/api/admin/suppliers")
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.requests ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const markSeen = async (id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, seen: true } : r)));
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, seen: true }),
      });
      if (!res.ok) throw new Error("Failed to mark as seen");
    } catch {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, seen: false } : r)));
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div>
          <button
            onClick={() => router.push("/manage/stock")}
            style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
          >
            ← Stock
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <h1 style={{ fontSize: "1rem", fontWeight: 700 }}>Supplier Inbox</h1>
            {unseenCount > 0 && (
              <span
                style={{
                  background: "#166534",
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "9999px",
                }}
              >
                {unseenCount} new
              </span>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af" }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "#9ca3af" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <p>No supplier enquiries yet.</p>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "14px 16px",
                border: `1.5px solid ${r.seen ? "#e5e7eb" : "#bbf7d0"}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div style={{ flex: 1 }}>
                {!r.seen && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#166534",
                      marginRight: "6px",
                      verticalAlign: "middle",
                    }}
                  />
                )}
                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{r.name}</span>
                <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#374151", lineHeight: 1.6 }}>
                  <p>
                    <strong>Item:</strong> {r.veg_name}
                    {r.approx_qty && ` · ~${r.approx_qty}`}
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    <a href={`tel:${r.phone}`} style={{ color: "#166534", fontWeight: 700 }}>
                      {r.phone}
                    </a>
                  </p>
                  {r.created_at && (
                    <p style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: "4px" }}>
                      {new Date(r.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  )}
                </div>
              </div>
              {!r.seen && (
                <button
                  onClick={() => markSeen(r.id)}
                  id={`mark-seen-${r.id}`}
                  style={{
                    flexShrink: 0,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    padding: "4px 10px",
                    borderRadius: "6px",
                  }}
                >
                  Mark seen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
