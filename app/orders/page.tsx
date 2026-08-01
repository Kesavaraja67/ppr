"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderItem {
  id: string;
  name_en: string;
  name_ta: string;
  requested_qty: string;
  unit: string;
}

interface Order {
  id: string;
  delivery_date: string;
  status: string;
  subtotal: string | null;
  delivery_charge: string | null;
  total_amount: string | null;
  cancellable_until: string;
  created_at: string;
  items?: OrderItem[];
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "#92400e" },
    cancelled: { label: "Cancelled", color: "#6b7280" },
    priced: { label: "Priced", color: "#0369a1" },
    out_for_delivery: { label: "Out for delivery", color: "#b45309" },
    delivered: { label: "Delivered", color: "#15803d" },
  };
  return map[status] ?? { label: status, color: "#6b7280" };
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopPhone, setShopPhone] = useState("94437 21544");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));

    fetch("/api/shop-config")
      .then((r) => r.json())
      .then((d) => {
        if (d?.phone_number) setShopPhone(d.phone_number);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="page-content" style={{ padding: "20px 16px" }}>
        <div style={{ height: "24px", width: "120px", background: "#E5E7EB", borderRadius: "8px", marginBottom: "24px" }} />
        <div style={{ background: "#fff", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #E5E7EB" }}>
          <div style={{ height: "20px", width: "60%", background: "#F3F4F6", borderRadius: "6px", marginBottom: "12px" }} />
          <div style={{ height: "16px", width: "40%", background: "#F3F4F6", borderRadius: "6px" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: "500px", margin: "0 auto" }} className="page-content">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#F3F4F6",
            color: "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          <BackIcon />
        </Link>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font)", color: "var(--text-primary)" }}>
          My Orders
        </h1>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: "#ffffff", borderRadius: "20px", border: "1.5px solid var(--border)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "20px" }}>No orders placed yet.</p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#1A6B47",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            Browse fresh items
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map((order) => {
            const statusInfo = statusLabel(order.status);
            const delivDate = new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });

            return (
              <div
                key={order.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "18px",
                  border: "1.5px solid var(--border)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--text-primary)", fontFamily: "var(--font)" }}>
                      Delivery: {delivDate}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      background: `${statusInfo.color}18`,
                      color: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "12px", marginBottom: "12px" }}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", paddingBottom: "6px" }}>
                        <span style={{ color: "var(--text-primary)" }}>{item.name_en} <span style={{ color: "#9CA3AF" }}>({item.name_ta})</span></span>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {Number(item.requested_qty)} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {order.total_amount && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", background: "#F9FAFB", padding: "10px 12px", borderRadius: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Subtotal:</span>
                      <span>₹{Number(order.subtotal).toFixed(0)}</span>
                    </div>
                    {Number(order.delivery_charge) > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-muted)" }}>Delivery charge:</span>
                        <span>₹{Number(order.delivery_charge).toFixed(0)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.9rem", borderTop: "1px solid #E5E7EB", paddingTop: "6px", marginTop: "4px" }}>
                      <span>Total Amount:</span>
                      <span style={{ color: "#1A6B47" }}>₹{Number(order.total_amount).toFixed(0)}</span>
                    </div>
                  </div>
                )}

                {/* Policy Notice: For changes/cancellations, call shop owner */}
                <div style={{ borderTop: "1px dashed #E5E7EB", paddingTop: "12px", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "0.76rem", color: "#6B7280", lineHeight: 1.35, flex: 1 }}>
                    Need to modify or cancel your order? Please call the shop owner directly.
                  </p>
                  <a
                    href={`tel:${shopPhone}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#E6F4EE",
                      color: "#1A6B47",
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      border: "1px solid #C3E6D0",
                      flexShrink: 0,
                      marginLeft: "10px",
                    }}
                  >
                    <PhoneIcon /> Call Shop
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
