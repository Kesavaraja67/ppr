"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";

interface OrderItem {
  id: string;
  veg_id: string;
  requested_qty: string;
  unit: string;
  price_per_unit: string | null;
  line_total: string | null;
  name_en: string | null;
  name_ta: string | null;
}

interface OrderHistoryItem {
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
  items: OrderItem[];
}

interface DailyBreakdown {
  date: string;
  delivered_count: number;
  total_revenue: number;
  total_orders: number;
}

interface Stats {
  total_delivered: number;
  total_revenue: number;
  total_all_orders: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export default function AdminOrderHistoryPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    has_more: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback((status = filterStatus, pageNum = page, showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);

    const query = new URLSearchParams({
      status: status,
      page: String(pageNum),
      limit: "20",
    });

    fetch(`/api/admin/history?${query.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load order history");
        return r.json();
      })
      .then((d) => {
        setStats(d.stats ?? null);
        setDailyBreakdown(d.daily_breakdown ?? []);
        setOrders(d.orders ?? []);
        if (d.pagination) {
          setPagination(d.pagination);
        }
      })
      .catch((err) => setError(err.message ?? "Failed to load order history"))
      .finally(() => setLoading(false));
  }, [filterStatus, page]);

  useEffect(() => {
    loadHistory(filterStatus, page, true);
  }, [filterStatus, page]);

  const handleFilterChange = (newStatus: string) => {
    setFilterStatus(newStatus);
    setPage(1);
  };

  if (loading && orders.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#6b7280", fontFamily: "var(--font)" }}>
        Loading order history…
      </div>
    );
  }

  return (
    <div className="page-content" style={{ padding: "16px", maxWidth: "768px", margin: "0 auto", fontFamily: "var(--font)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <Link href="/manage/stock" style={{ fontSize: "0.8rem", color: "#6b7280", textDecoration: "none" }}>
            ← Admin Dashboard
          </Link>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Order History
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#6b7280" }}>
            Complete order records &amp; delivery analytics
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: 500 }}>{error}</p>
          <button
            onClick={() => loadHistory(filterStatus, page, true)}
            style={{
              padding: "6px 14px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #bbf7d0",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Total Delivered
          </span>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#15803d" }}>
            {stats?.total_delivered ?? 0}
          </span>
          <span style={{ fontSize: "0.78rem", color: "#166534", display: "block", marginTop: "2px" }}>
            successful deliveries
          </span>
        </div>

        <div
          style={{
            background: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Total Revenue
          </span>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1d4ed8" }}>
            ₹{(stats?.total_revenue ?? 0).toLocaleString("en-IN")}
          </span>
          <span style={{ fontSize: "0.78rem", color: "#1e40af", display: "block", marginTop: "2px" }}>
            from delivered orders
          </span>
        </div>
      </div>

      {/* Daily Delivery Breakdown Section */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "16px 18px",
          border: "1.5px solid #e5e7eb",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Deliveries by Day
        </h2>

        {dailyBreakdown.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
            No delivery history recorded yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dailyBreakdown.map((item) => {
              const formattedDay = new Date(item.date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={item.date}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#f9fafb",
                    border: "1px solid #f3f4f6",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1f2937" }}>{formattedDay}</p>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "1px" }}>
                      Total orders on this day: {item.total_orders}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#166534" }}>
                      {item.delivered_count} delivered
                    </span>
                    {item.total_revenue > 0 && (
                      <p style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600, marginTop: "1px" }}>
                        ₹{item.total_revenue.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
        {[
          { key: "all", label: "All Orders" },
          { key: "delivered", label: "Delivered" },
          { key: "out_for_delivery", label: "Out for Delivery" },
          { key: "priced", label: "Priced" },
          { key: "pending", label: "Pending" },
          { key: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              border: filterStatus === tab.key ? "none" : "1px solid #e5e7eb",
              background: filterStatus === tab.key ? "#166534" : "#fff",
              color: filterStatus === tab.key ? "#fff" : "#4b5563",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detailed Orders List */}
      {orders.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "16px", padding: "32px 16px", textAlign: "center", border: "1.5px solid #e5e7eb" }}>
          <p style={{ color: "#9ca3af", fontSize: "0.88rem" }}>No orders found for this status filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {orders.map((order) => {
            const dateStr = new Date(order.delivery_date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });

            return (
              <div
                key={order.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "16px",
                  border: "1.5px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                {/* Header — Customer Name, Phone & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "0.98rem", color: "#111827" }}>
                      {order.user_name ?? "Customer"}
                    </h3>
                    {order.user_phone && (
                      <a
                        href={`tel:${order.user_phone}`}
                        style={{
                          fontSize: "0.82rem",
                          color: "#166534",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "2px",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z" />
                        </svg>
                        {order.user_phone}
                      </a>
                    )}
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "2px" }}>
                      Delivery: <strong>{dateStr}</strong>
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Address */}
                {order.address_text && (
                  <p style={{ fontSize: "0.78rem", color: "#4b5563", background: "#f9fafb", padding: "8px 10px", borderRadius: "8px", border: "1px solid #f3f4f6", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {order.address_text}
                  </p>
                )}

                {/* Items breakdown */}
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "8px", marginBottom: "10px" }}>
                  {order.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", paddingBottom: "3px" }}>
                      <span style={{ color: "#374151" }}>
                        {item.name_en} <span style={{ color: "#9ca3af" }}>({item.name_ta})</span>
                      </span>
                      <span style={{ fontWeight: 700, color: "#111827" }}>
                        {Number(item.requested_qty)} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total amount */}
                {order.total_amount && (
                  <div style={{ display: "flex", justifyContent: "space-between", background: "#f0fdf4", padding: "8px 12px", borderRadius: "8px", fontSize: "0.83rem" }}>
                    <span style={{ color: "#166534", fontWeight: 500 }}>
                      Bill Amount
                    </span>
                    <span style={{ fontWeight: 800, color: "#15803d" }}>
                      Total ₹{Number(order.total_amount).toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "12px", background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: page <= 1 ? "#f3f4f6" : "#fff",
              color: page <= 1 ? "#9ca3af" : "#374151",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
            Page <strong>{page}</strong> of <strong>{Math.ceil(pagination.total / pagination.limit) || 1}</strong>
          </span>
          <button
            disabled={!pagination.has_more}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: !pagination.has_more ? "#f3f4f6" : "#fff",
              color: !pagination.has_more ? "#9ca3af" : "#374151",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: !pagination.has_more ? "not-allowed" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
