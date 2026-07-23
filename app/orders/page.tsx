"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Order {
  id: string;
  delivery_date: string;
  status: string;
  subtotal: string | null;
  delivery_charge: string | null;
  total_amount: string | null;
  cancellable_until: string;
  created_at: string;
  items?: {
    id: string;
    name_en: string;
    name_ta: string;
    requested_qty: string;
    unit: string;
  }[];
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "#166534" },
    cancelled: { label: "Cancelled", color: "#6b7280" },
    priced: { label: "Priced", color: "#0369a1" },
    out_for_delivery: { label: "Out for delivery", color: "#b45309" },
    delivered: { label: "Delivered", color: "#15803d" },
  };
  return map[status] ?? { label: status, color: "#6b7280" };
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [shopPhone, setShopPhone] = useState("");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));

    fetch("/api/shop-config")
      .then((r) => r.json())
      .then((d) => setShopPhone(d.phone_number ?? ""));
  }, []);

  const cancelOrder = async (id: string) => {
    setCancellingId(id);
    const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o))
      );
    } else {
      const d = await res.json();
      alert(d.error ?? "Could not cancel the order.");
    }
    setCancellingId(null);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#6b7280" }}>
        Loading your orders…
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }} className="page-content">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <Link href="/" style={{ fontSize: "1.2rem", color: "#6b7280" }}>←</Link>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700 }}>My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "#6b7280", marginBottom: "20px" }}>No orders yet.</p>
          <Link href="/" className="btn-accent" style={{ display: "inline-flex" }}>
            Browse catalog
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {orders.map((order) => {
            const cutoff = new Date(order.cancellable_until);
            const canCancel = order.status === "pending" && new Date() < cutoff;
            const statusInfo = statusLabel(order.status);
            const delivDate = new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });

            return (
              <div
                key={order.id}
                className="product-card"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      Delivery: {delivDate}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "2px" }}>
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      background: `${statusInfo.color}18`,
                      color: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "10px", marginBottom: "12px" }}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", paddingBottom: "4px" }}>
                        <span>{item.name_en} <span style={{ color: "#9ca3af" }}>({item.name_ta})</span></span>
                        <span style={{ fontWeight: 700 }}>
                          {Number(item.requested_qty)} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {order.total_amount && (
                  <div style={{ fontSize: "0.85rem", color: "#374151", marginBottom: "10px" }}>
                    <span>Subtotal: ₹{Number(order.subtotal).toFixed(0)}</span>
                    {Number(order.delivery_charge) > 0 && (
                      <span style={{ marginLeft: "10px" }}>
                        + Delivery: ₹{Number(order.delivery_charge).toFixed(0)}
                      </span>
                    )}
                    <span style={{ fontWeight: 700, marginLeft: "10px" }}>
                      Total: ₹{Number(order.total_amount).toFixed(0)}
                    </span>
                  </div>
                )}

                {order.status === "pending" && (
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "10px" }}>
                    Cancel by: {cutoff.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })} today
                  </p>
                )}

                {canCancel ? (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                    style={{
                      padding: "8px 18px",
                      border: "1.5px solid #fecaca",
                      borderRadius: "9999px",
                      background: "#fff",
                      color: "#dc2626",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {cancellingId === order.id ? "Cancelling…" : "Cancel Order"}
                  </button>
                ) : order.status === "pending" ? (
                  <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                    Cancellation window closed —{" "}
                    {shopPhone && (
                      <a href={`tel:${shopPhone}`} style={{ color: "#166534" }}>
                        call the shop
                      </a>
                    )}{" "}
                    to cancel.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
