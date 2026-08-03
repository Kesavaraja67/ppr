"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";

interface OrderItem {
  id: string;
  veg_id: string;
  requested_qty: string;
  unit: string;
  name_en: string | null;
  name_ta: string | null;
  category: string | null;
}

interface Order {
  id: string;
  status: string;
  delivery_date: string;
  cancellable_until: string;
  created_at: string;
  priced_at: string | null;
  subtotal: string | null;
  delivery_charge: string | null;
  total_amount: string | null;
  user_phone: string | null;
  user_name: string | null;
  address_text: string | null;
  lat: number | null;
  long: number | null;
  items: OrderItem[];
}

const STATUS_TRANSITIONS: Record<string, { next: string; label: string }[]> = {
  pending:          [
    { next: "cancelled", label: "Cancel Order" }
  ],
  priced:           [
    { next: "out_for_delivery", label: "Mark Out for Delivery" },
    { next: "cancelled", label: "Cancel Order" }
  ],
  out_for_delivery: [
    { next: "delivered", label: "Mark Delivered" },
    { next: "cancelled", label: "Cancel Order" }
  ],
  delivered:        [],
  cancelled:        [],
};

// ── Web Audio chime — synthesised, no external file needed ────────────────────
function playNewOrderChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const play = (freq: number, startAt: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration + 0.05);
    };
    play(880,  0,    0.35, 0.4);  // A5  — first note
    play(1108, 0.3,  0.5,  0.3);  // C#6 — second note (rising ding)
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // AudioContext unavailable — silent fail
  }
}

function PhoneCallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

const POLL_INTERVAL_MS = 35_000;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());


  // Track IDs already seen so we can detect genuinely new arrivals on each poll
  const knownIdsRef = useRef<Set<string> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback((silent = false) => {
    fetch("/api/admin/orders?status=all")
      .then((r) => r.json())
      .then((d) => {
        const incoming: Order[] = d.orders ?? [];
        const incomingIds = new Set(incoming.map((o) => o.id));

        if (knownIdsRef.current === null) {
          // First load — populate baseline silently, no alert
          knownIdsRef.current = incomingIds;
        } else if (!silent) {
          // Subsequent polls — find genuinely new IDs
          const freshIds = new Set<string>();
          for (const id of incomingIds) {
            if (!knownIdsRef.current.has(id)) freshIds.add(id);
          }
          if (freshIds.size > 0) {
            playNewOrderChime();
            setNewOrderIds(freshIds);
            // Fade highlight out after 5 s
            setTimeout(() => setNewOrderIds(new Set()), 5000);
          }
          knownIdsRef.current = incomingIds;
        }

        setOrders(incoming);
      })
      .finally(() => setLoading(false));

  }, []);

  useEffect(() => {
    fetchOrders(true); // first load, silent

    intervalRef.current = setInterval(() => {
      fetchOrders(false); // polls, alert-enabled
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to update status.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#6b7280" }}>
        Loading orders…
      </div>
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowLabel = tomorrow.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const pendingCount  = orders.filter((o) => o.status === "pending").length;
  const pricedCount   = orders.filter((o) => o.status === "priced").length;
  const deliveryCount = orders.filter((o) => o.status === "out_for_delivery").length;
  const doneCount     = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="page-content" style={{ padding: "16px" }}>
      {/* Keyframe for new-order highlight pulse & tablet layout */}
      <style>{`
        @keyframes newOrderPulse {
          0%   { box-shadow: 0 0 0 0 rgba(22,101,52,0.45); border-color: #166534; background: #f0fdf4; }
          60%  { box-shadow: 0 0 0 8px rgba(22,101,52,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,101,52,0);   border-color: #e5e7eb; background: #fff; }
        }
        .order-card--new { animation: newOrderPulse 5s ease-out forwards; }
        .admin-orders-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .admin-orders-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <a href="/manage/stock" style={{ fontSize: "0.8rem", color: "#6b7280" }}>← Dashboard</a>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "4px" }}>
            Tomorrow&apos;s Orders
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#6b7280" }}>Delivery: {tomorrowLabel}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span
            style={{
              background: "#166534",
              color: "#fff",
              borderRadius: "9999px",
              padding: "4px 12px",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>auto-refreshes every 35s</span>
        </div>
      </div>

      {/* Status summary pills */}
      {orders.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {pendingCount  > 0 && <StatusBadge status="pending" />}
          {pricedCount   > 0 && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "9999px", background: "#dbeafe", color: "#1e40af" }}>{pricedCount} priced</span>}
          {deliveryCount > 0 && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "9999px", background: "#fde68a", color: "#78350f" }}>{deliveryCount} out for delivery</span>}
          {doneCount     > 0 && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "9999px", background: "#d1fae5", color: "#065f46" }}>{doneCount} delivered</span>}
        </div>
      )}

      {/* View toggle */}
      <div
        style={{
          display: "flex",
          gap: "0",
          border: "1.5px solid #e5e7eb",
          borderRadius: "9999px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            flex: 1,
            padding: "10px",
            textAlign: "center",
            background: "#166534",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          Orders
        </span>

        <Link
          href="/manage/purchase-list"
          style={{
            flex: 1,
            padding: "10px",
            textAlign: "center",
            border: "none",
            background: "#fff",
            color: "#6b7280",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Shopping List →
        </Link>

      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
          No orders for tomorrow yet.
        </div>
      ) : (
        <div className="admin-orders-grid">

          {orders.map((order) => {
            const transitions = STATUS_TRANSITIONS[order.status] ?? [];
            const isUpdating = updatingId === order.id;
            const isNew = newOrderIds.has(order.id);

            return (
              <div
                key={order.id}
                className={isNew ? "order-card--new" : undefined}
                style={{
                  background: "#fff",
                  border: `1.5px solid ${order.status === "delivered" ? "#d1fae5" : order.status === "out_for_delivery" ? "#fde68a" : "#e5e7eb"}`,
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Order header — customer name + phone + Call Customer button + status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {order.user_name ?? order.user_phone ?? "Unknown"}
                        </p>
                        {order.user_phone && (
                          <a
                            href={`tel:${order.user_phone}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "#E6F4EE",
                              color: "#1A6B47",
                              padding: "4px 10px",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              textDecoration: "none",
                              border: "1px solid #C3E6D0",
                            }}
                          >
                            <PhoneCallIcon /> Call
                          </a>
                        )}
                      </div>
                      {order.user_name && (
                        <p style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "2px" }}>{order.user_phone}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {isNew && (
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#166534", background: "#dcfce7", borderRadius: "9999px", padding: "2px 8px" }}>
                          NEW
                        </span>
                      )}
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Address & Google Maps button */}
                  {order.address_text && (
                    <div style={{ marginBottom: "12px", background: "#F9FAFB", padding: "10px", borderRadius: "10px", border: "1px solid #F3F4F6" }}>
                      <p style={{ fontSize: "0.8rem", color: "#374151", lineHeight: 1.4, marginBottom: "6px" }}>
                        {order.address_text}
                      </p>
                      {order.lat && order.long && (
                        <a
                          href={`https://www.google.com/maps?q=${order.lat},${order.long}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#ffffff",
                            color: "#166534",
                            padding: "4px 10px",
                            borderRadius: "9999px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textDecoration: "none",
                            border: "1px solid #C3E6D0",
                          }}
                        >
                          <MapPinIcon /> Open in Google Maps ↗
                        </a>
                      )}
                    </div>
                  )}

                {/* Items */}
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "10px", marginBottom: "12px" }}>
                  {order.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", paddingBottom: "4px" }}>
                      <span>{item.name_en} <span style={{ color: "#9ca3af" }}>({item.name_ta})</span></span>
                      <span style={{ fontWeight: 700 }}>{Number(item.requested_qty)} {item.unit}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing totals (if priced) */}
                {order.total_amount && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "0.83rem",
                      marginBottom: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      ₹{Number(order.subtotal).toFixed(0)} + ₹{Number(order.delivery_charge).toFixed(0)} delivery
                    </span>
                    <span style={{ fontWeight: 700, color: "#166534" }}>
                      Total ₹{Number(order.total_amount).toFixed(0)}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                  {(order.status === "pending" || order.status === "priced") && (
                    <Link
                      href={`/manage/orders/${order.id}/price`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "9px",
                        background: "#166534",
                        color: "#fff",
                        borderRadius: "9999px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      {order.status === "priced" ? "Edit Prices & Bill →" : "Enter Prices & Bill →"}
                    </Link>
                  )}

                  {transitions.map((t) => (
                    <button
                      key={t.next}
                      onClick={() => updateStatus(order.id, t.next)}
                      disabled={isUpdating}
                      style={{
                        padding: "9px",
                        border: `1.5px solid ${t.next === "cancelled" ? "#fecaca" : "#bbf7d0"}`,
                        borderRadius: "9999px",
                        background: "#fff",
                        color: t.next === "cancelled" ? "#dc2626" : "#166534",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {isUpdating ? "Updating…" : t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

