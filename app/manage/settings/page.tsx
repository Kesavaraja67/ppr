"use client";

import { useState, useEffect } from "react";

interface Config {
  id: string;
  shop_name: string;
  owner_name: string;
  phone_number: string;
  lat: string;
  long: string;
  delivery_radius_km: string;
  free_delivery_veg_threshold: string;
  free_delivery_fruit_threshold: string;
  free_delivery_mixed_threshold: string;
  flat_delivery_charge: string;
  min_order_amount: string;
  covered_areas: string[] | null;
  // Leave-mode (R7)
  is_on_leave: boolean;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_message: string | null;
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setConfig(d.config));
  }, []);

  const update = (field: keyof Config, value: string | boolean | null) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: config.shop_name,
        owner_name: config.owner_name,
        phone_number: config.phone_number,
        lat: Number(config.lat),
        long: Number(config.long),
        delivery_radius_km: Number(config.delivery_radius_km),
        free_delivery_veg_threshold: Number(config.free_delivery_veg_threshold),
        free_delivery_fruit_threshold: Number(config.free_delivery_fruit_threshold),
        free_delivery_mixed_threshold: Number(config.free_delivery_mixed_threshold),
        flat_delivery_charge: Number(config.flat_delivery_charge),
        min_order_amount: Number(config.min_order_amount),
        // Leave-mode fields
        is_on_leave: config.is_on_leave,
        leave_start_date: config.leave_start_date || null,
        leave_end_date: config.leave_end_date || null,
        leave_message: config.leave_message || null,
      }),
    });

    setSaving(false);
    if (res.ok) setSaved(true);
    else alert("Failed to save. Please try again.");
  };

  if (!config) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading…</div>;
  }

  const field = (
    label: string,
    key: keyof Config,
    type = "text",
    hint?: string
  ) => (
    <div style={{ marginBottom: "14px" }}>
      <label
        style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}
      >
        {label}
      </label>
      {hint && <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: "4px" }}>{hint}</p>}
      <input
        type={type}
        className="admin-input"
        value={String(config[key] ?? "")}
        onChange={(e) => update(key, e.target.value)}
        inputMode={type === "number" ? "decimal" : undefined}
      />
    </div>
  );

  return (
    <div className="page-content" style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <a href="/manage/stock" style={{ fontSize: "1.2rem", color: "#6b7280" }}>←</a>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Shop Settings</h1>
      </div>

      {/* Shop Info */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Shop Info
        </h2>
        {field("Shop Name", "shop_name")}
        {field("Owner Name", "owner_name")}
        {field("Phone Number", "phone_number", "tel")}
      </div>

      {/* Location & Delivery */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Location &amp; Delivery
        </h2>
        {field("Latitude", "lat", "number", "Shop GPS latitude (e.g. 11.0915)")}
        {field("Longitude", "long", "number", "Shop GPS longitude (e.g. 76.9452)")}
        {field("Delivery Radius (km)", "delivery_radius_km", "number", "Orders from further than this distance are hard-blocked.")}
      </div>

      {/* Delivery Charges */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Delivery Charges
        </h2>
        {field("Minimum Order Value (₹)", "min_order_amount", "number", "Orders with all priced items below this total will be blocked.")}
        {field("Flat Delivery Charge (₹)", "flat_delivery_charge", "number", "Applied when order total is below the threshold.")}
        {field("Free Delivery — Vegetables only (₹)", "free_delivery_veg_threshold", "number", "Veg-only orders above this amount get free delivery.")}
        {field("Free Delivery — Fruits only (₹)", "free_delivery_fruit_threshold", "number", "Fruit-only orders above this amount get free delivery.")}
        {field("Free Delivery — Mixed orders (₹)", "free_delivery_mixed_threshold", "number", "Mixed orders above this amount get free delivery.")}
      </div>

      {/* ── On-Leave / Shop Holiday Banner (R7) ─────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#b45309", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Shop On-Leave / Holiday
        </h2>

        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "14px" }}>
          When enabled, a leave banner is shown on all pages to inform customers the shop is temporarily closed.
        </p>

        {/* Toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            marginBottom: "14px",
            background: config.is_on_leave ? "#FEF3C7" : "#F9FAFB",
            border: `1.5px solid ${config.is_on_leave ? "#FDE68A" : "#E5E7EB"}`,
            borderRadius: "12px",
            padding: "12px 14px",
            transition: "all 150ms",
          }}
        >
          <input
            type="checkbox"
            checked={config.is_on_leave}
            onChange={(e) => update("is_on_leave", e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#b45309", flexShrink: 0 }}
          />
          <div>
            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: config.is_on_leave ? "#92400e" : "#374151" }}>
              {config.is_on_leave ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#DC2626", display: "inline-block" }} />
                  Shop is currently on leave
                </span>
              ) : (
                "Shop is open — toggle to enable leave banner"
              )}
            </p>
            <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "2px" }}>
              Customers will see the leave banner on every page when this is on.
            </p>
          </div>
        </label>

        {/* Date range (optional) */}
        {config.is_on_leave && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
                Leave from (optional)
              </label>
              <input
                type="date"
                className="admin-input"
                value={config.leave_start_date ?? ""}
                onChange={(e) => update("leave_start_date", e.target.value || null)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
                Leave until (optional)
              </label>
              <input
                type="date"
                className="admin-input"
                value={config.leave_end_date ?? ""}
                onChange={(e) => update("leave_end_date", e.target.value || null)}
              />
            </div>
          </div>
        )}

        {/* Custom message */}
        {config.is_on_leave && (
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
              Custom message (optional)
            </label>
            <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: "4px" }}>
              If blank, the banner will show the default message with the date range.
            </p>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g. We're on holiday until 15th Aug — back soon!"
              value={config.leave_message ?? ""}
              onChange={(e) => update("leave_message", e.target.value || null)}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          className="btn-accent"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
