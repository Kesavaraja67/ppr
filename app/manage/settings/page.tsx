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
  covered_areas: string[] | null;
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

  const update = (field: keyof Config, value: string) => {
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

      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Shop Info
        </h2>
        {field("Shop Name", "shop_name")}
        {field("Owner Name", "owner_name")}
        {field("Phone Number", "phone_number", "tel")}
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Location & Delivery
        </h2>
        {field("Latitude", "lat", "number", "Shop GPS latitude (e.g. 11.0915)")}
        {field("Longitude", "long", "number", "Shop GPS longitude (e.g. 76.9452)")}
        {field("Delivery Radius (km)", "delivery_radius_km", "number", "Orders from further than this distance are hard-blocked.")}
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Delivery Charges
        </h2>
        {field("Flat Delivery Charge (₹)", "flat_delivery_charge", "number", "Applied when order total is below the threshold.")}
        {field("Free Delivery — Vegetables only (₹)", "free_delivery_veg_threshold", "number", "Veg-only orders above this amount get free delivery.")}
        {field("Free Delivery — Fruits only (₹)", "free_delivery_fruit_threshold", "number", "Fruit-only orders above this amount get free delivery.")}
        {field("Free Delivery — Mixed orders (₹)", "free_delivery_mixed_threshold", "number", "Mixed orders above this amount get free delivery.")}
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
