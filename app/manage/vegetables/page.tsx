"use client";

import { useState, useEffect, useRef } from "react";

interface Vegetable {
  id: string;
  name_en: string;
  name_ta: string;
  unit: string;
  category: string;
  allow_piece_mode?: boolean;
  current_price?: string | null;
  in_stock: boolean;
  image_url: string | null;
}

const UNITS = ["kg", "g", "bunch", "piece", "dozen", "bag"];
const CATEGORIES = [
  { value: "vegetable", label: "Vegetable" },
  { value: "fruit", label: "Fruit" },
  { value: "grocery", label: "Grocery" },
];

function LeafIcon({ color = "#166534" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.9.9 7.1A5 5 0 0 1 12 20z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function resizeImage(file: File, maxDim = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject("Canvas not supported");

    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function AdminVegetablesPage() {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "removed">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [editingVeg, setEditingVeg] = useState<Vegetable | null>(null);

  // Add/Edit Form State
  const [nameEn, setNameEn] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [nameTaLoading, setNameTaLoading] = useState(false);
  const [unit, setUnit] = useState("kg");
  const [category, setCategory] = useState("vegetable");
  const [allowPieceMode, setAllowPieceMode] = useState(true);
  const [currentPrice, setCurrentPrice] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/vegetables")
      .then((r) => r.json())
      .then((d) => setVegetables(d.vegetables ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Auto-lookup Tamil name when English name is typed (only in add mode)
  useEffect(() => {
    if (editingVeg || !nameEn.trim() || nameTa) return;
    const timer = setTimeout(async () => {
      setNameTaLoading(true);
      const res = await fetch(`/api/admin/vegetables-list?lookup=${encodeURIComponent(nameEn)}`);
      if (res.ok) {
        const d = await res.json();
        if (d.tamil) setNameTa(d.tamil);
      }
      setNameTaLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [nameEn, nameTa, editingVeg]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setImageData(resized);
  };

  const startEdit = (veg: Vegetable) => {
    setEditingVeg(veg);
    setNameEn(veg.name_en);
    setNameTa(veg.name_ta);
    setUnit(veg.unit);
    setCategory(veg.category);
    setAllowPieceMode(veg.allow_piece_mode ?? true);
    setCurrentPrice(veg.current_price ?? "");
    setImageData(veg.image_url);
    setShowAdd(false);
  };

  const resetForm = () => {
    setNameEn("");
    setNameTa("");
    setUnit("kg");
    setCategory("vegetable");
    setAllowPieceMode(true);
    setCurrentPrice("");
    setImageData(null);
    setShowAdd(false);
    setEditingVeg(null);
  };

  const handleSave = async () => {
    if (!nameEn.trim() || !unit || !category) return;
    setSaving(true);

    const pricePayload = currentPrice.trim() !== "" ? currentPrice.trim() : null;

    if (editingVeg) {
      // UPDATE existing item
      const res = await fetch("/api/admin/vegetables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVeg.id,
          name_en: nameEn.trim(),
          name_ta: nameTa.trim() || undefined,
          unit,
          category,
          allow_piece_mode: allowPieceMode,
          current_price: pricePayload,
          image_data_url: imageData ?? undefined,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setVegetables((prev) =>
          prev.map((v) => (v.id === editingVeg.id ? d.vegetable : v))
        );
        resetForm();
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to save changes.");
      }
    } else {
      // ADD new item
      const res = await fetch("/api/admin/vegetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: nameEn.trim(),
          name_ta: nameTa.trim() || undefined,
          unit,
          category,
          allow_piece_mode: allowPieceMode,
          current_price: pricePayload,
          image_data_url: imageData ?? undefined,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setVegetables((prev) => [...prev, d.vegetable]);
        resetForm();
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to add item.");
      }
    }
    setSaving(false);
  };

  // Toggle item between Active and Removed (in_stock = true / false)
  const setItemStock = async (veg: Vegetable, inStock: boolean) => {
    await fetch("/api/admin/vegetables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: veg.id, in_stock: inStock }),
    });
    setVegetables((prev) =>
      prev.map((v) => (v.id === veg.id ? { ...v, in_stock: inStock } : v))
    );
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading…</div>;
  }

  const activeItems = vegetables.filter((v) => v.in_stock);
  const removedItems = vegetables.filter((v) => !v.in_stock);
  const displayedItems = activeTab === "active" ? activeItems : removedItems;

  return (
    <div className="page-content" style={{ padding: "16px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <a href="/manage/stock" style={{ fontSize: "0.8rem", color: "#6b7280" }}>← Dashboard</a>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "4px" }}>Manage Items</h1>
        </div>
        <button
          className="btn-accent"
          style={{ fontSize: "0.85rem" }}
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
        >
          + Add New
        </button>
      </div>

      {/* Tabs: Active vs Removed Archive */}
      <div
        style={{
          display: "flex",
          border: "1.5px solid #e5e7eb",
          borderRadius: "9999px",
          overflow: "hidden",
          marginBottom: "20px",
          background: "#fff",
        }}
      >
        <button
          onClick={() => setActiveTab("active")}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            background: activeTab === "active" ? "#166534" : "transparent",
            color: activeTab === "active" ? "#fff" : "#6b7280",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Active Items ({activeItems.length})
        </button>
        <button
          onClick={() => setActiveTab("removed")}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            background: activeTab === "removed" ? "#dc2626" : "transparent",
            color: activeTab === "removed" ? "#fff" : "#6b7280",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Removed Archive ({removedItems.length})
        </button>
      </div>

      {/* Add / Edit Form */}
      {(showAdd || editingVeg) && (
        <div
          style={{
            background: editingVeg ? "#eff6ff" : "#f0fdf4",
            border: `1.5px solid ${editingVeg ? "#bfdbfe" : "#bbf7d0"}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "14px", color: editingVeg ? "#1e40af" : "#166534" }}>
            {editingVeg ? `Edit "${editingVeg.name_en}"` : "Add New Item"}
          </h2>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
                Name (English) *
              </label>
              <input
                className="admin-input"
                placeholder="e.g. Tomato"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
                Name (Tamil) {nameTaLoading ? "..." : ""}
              </label>
              <input
                className="admin-input"
                placeholder="தக்காளி"
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
                Unit *
              </label>
              <select
                className="admin-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
                Category *
              </label>
              <select
                className="admin-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Optional Reference Price */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "2px" }}>
              Price (₹) per {unit} — leave blank if you haven&apos;t decided yet
            </label>
            <p style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: "6px" }}>
              Optional reference price shown to customers. If left empty, customers will see &quot;Price will be updated soon&quot;.
            </p>
            <input
              className="admin-input"
              type="number"
              step="any"
              min="0"
              placeholder={`e.g. 40 (for ₹40/${unit})`}
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
            />
          </div>

          {/* Dual ordering mode checkbox */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allowPieceMode}
                onChange={(e) => setAllowPieceMode(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#166534" }}
              />
              Also allow ordering by piece (Weight / Piece mode toggle for customers)
            </label>
          </div>

          {/* Photo upload */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
              Photo (optional)
            </label>
            {imageData ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageData} alt="Preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                <button onClick={() => setImageData(null)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>
                  Remove photo
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: "10px 18px",
                  border: "1.5px dashed #bbf7d0",
                  borderRadius: "9999px",
                  background: "#fff",
                  color: "#166534",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CameraIcon /> Choose Photo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-accent"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                justifyContent: "center",
                background: editingVeg ? "#1e40af" : "#166534",
              }}
            >
              {saving ? "Saving…" : editingVeg ? "Save Changes" : "Save Item"}
            </button>
            <button
              onClick={resetForm}
              style={{
                flex: 1,
                padding: "14px",
                border: "1.5px solid #e5e7eb",
                borderRadius: "9999px",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#6b7280",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {displayedItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#9ca3af", fontSize: "0.9rem" }}>
          {activeTab === "active"
            ? "No active items in catalog."
            : "No removed items in archive."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {displayedItems.map((veg) => (
            <div
              key={veg.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
              }}
            >
              {veg.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={veg.image_url}
                  alt={veg.name_en}
                  style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#f0f7f2",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <LeafIcon color="#166534" />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: "0.92rem" }}>{veg.name_en}</p>
                <p style={{ color: "#9ca3af", fontSize: "0.76rem", marginTop: "2px" }}>
                  {veg.name_ta} · {veg.unit} · {veg.category}
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {/* Edit Button */}
                <button
                  onClick={() => startEdit(veg)}
                  title="Edit item details"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "9999px",
                    border: "1.5px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#374151",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <EditIcon /> Edit
                </button>

                {/* Remove or Restore Button */}
                {veg.in_stock ? (
                  <button
                    onClick={() => setItemStock(veg, false)}
                    title="Remove item from catalog (moves to Archive)"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      border: "1.5px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <TrashIcon /> Remove
                  </button>
                ) : (
                  <button
                    onClick={() => setItemStock(veg, true)}
                    title="Restore item back to Active catalog"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      border: "1.5px solid #bbf7d0",
                      background: "#f0fdf4",
                      color: "#166534",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <RestoreIcon /> Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
