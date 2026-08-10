"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { lookupTamilName, lookupEnglishName } from "@/lib/tamil-dict";

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

function GalleryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path d="M5 3 L5.8 5.2 L8 6 L5.8 6.8 L5 9 L4.2 6.8 L2 6 L4.2 5.2 Z" />
      <path d="M19 14 L19.6 15.7 L21 16.5 L19.6 17.3 L19 19 L18.4 17.3 L17 16.5 L18.4 15.7 Z" />
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
  const [unit, setUnit] = useState("kg");
  const [category, setCategory] = useState("vegetable");
  const [allowPieceMode, setAllowPieceMode] = useState(true);
  const [currentPrice, setCurrentPrice] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageGenError, setImageGenError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Translation auto-fill state & refs
  const [taAutoFilled, setTaAutoFilled] = useState(false);
  const [enAutoFilled, setEnAutoFilled] = useState(false);
  const [taTranslating, setTaTranslating] = useState(false);
  const [enTranslating, setEnTranslating] = useState(false);
  const activeFieldRef = useRef<"en" | "ta" | null>(null);
  const enDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image file input refs
  const fileRef = useRef<HTMLInputElement>(null);    // gallery
  const cameraRef = useRef<HTMLInputElement>(null);  // camera

  useEffect(() => {
    fetch("/api/admin/vegetables")
      .then((r) => r.json())
      .then((d) => setVegetables(d.vegetables ?? []))
      .finally(() => setLoading(false));
  }, []);

  // ── EN → TA auto-fill ────────────────────────────────────────────────────
  const handleNameEnChange = useCallback(
    (value: string) => {
      setNameEn(value);
      // Flip isEnAutoFilled off if user is actively editing English
      if (enAutoFilled) setEnAutoFilled(false);

      if (enDebounceRef.current) clearTimeout(enDebounceRef.current);
      if (!value.trim()) return;

      enDebounceRef.current = setTimeout(async () => {
        // Only write to Tamil when Tamil field is not currently focused
        if (activeFieldRef.current === "ta") return;
        // Only overwrite Tamil if it is empty or was previously auto-filled
        setNameTa((prevTa) => {
          const wouldOverwrite = prevTa !== "" && !taAutoFilled;
          if (wouldOverwrite) return prevTa;

          // 1. Static dict lookup (instant)
          const staticResult = lookupTamilName(value);
          if (staticResult) {
            setTaAutoFilled(true);
            return staticResult;
          }

          // 2. API fallback (async, runs after returning current state)
          setTaTranslating(true);
          fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: value.trim(), from: "en", to: "ta" }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.translation && activeFieldRef.current !== "ta") {
                setNameTa((cur) => {
                  if (cur === "" || taAutoFilled) {
                    setTaAutoFilled(true);
                    return d.translation;
                  }
                  return cur;
                });
              }
            })
            .catch(() => {/* fail silently */})
            .finally(() => setTaTranslating(false));

          return prevTa; // don't change yet — async will update
        });
      }, 300);
    },
    [enAutoFilled, taAutoFilled]
  );

  // ── TA → EN auto-fill ────────────────────────────────────────────────────
  const handleNameTaChange = useCallback(
    (value: string) => {
      setNameTa(value);
      if (taAutoFilled) setTaAutoFilled(false);

      if (taDebounceRef.current) clearTimeout(taDebounceRef.current);
      if (!value.trim()) return;

      taDebounceRef.current = setTimeout(async () => {
        if (activeFieldRef.current === "en") return;
        setNameEn((prevEn) => {
          const wouldOverwrite = prevEn !== "" && !enAutoFilled;
          if (wouldOverwrite) return prevEn;

          // 1. Static reverse dict (instant)
          const staticResult = lookupEnglishName(value);
          if (staticResult) {
            const formatted = staticResult.charAt(0).toUpperCase() + staticResult.slice(1);
            setEnAutoFilled(true);
            return formatted;
          }

          // 2. API fallback
          setEnTranslating(true);
          fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: value.trim(), from: "ta", to: "en" }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.translation && activeFieldRef.current !== "en") {
                setNameEn((cur) => {
                  if (cur === "" || enAutoFilled) {
                    setEnAutoFilled(true);
                    return d.translation;
                  }
                  return cur;
                });
              }
            })
            .catch(() => {/* fail silently */})
            .finally(() => setEnTranslating(false));

          return prevEn;
        });
      }, 300);
    },
    [taAutoFilled, enAutoFilled]
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setImageData(resized);
    setImageGenError("");
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleGenerateImage = async () => {
    if (generating) return;
    setGenerating(true);
    setImageGenError("");
    try {
      const res = await fetch("/api/admin/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_en: nameEn.trim(), name_ta: nameTa.trim() || undefined, category }),
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        setImageGenError(d.error ?? "Image generation failed.");
      } else if (d.imageDataUrl) {
        setImageData(d.imageDataUrl);
      }
    } catch {
      setImageGenError("Network error during image generation.");
    } finally {
      setGenerating(false);
    }
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
    setTaAutoFilled(false);
    setEnAutoFilled(false);
    setImageGenError("");
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
    setTaAutoFilled(false);
    setEnAutoFilled(false);
    setImageGenError("");
    if (enDebounceRef.current) clearTimeout(enDebounceRef.current);
    if (taDebounceRef.current) clearTimeout(taDebounceRef.current);
  };

  const handleSave = async () => {
    if (!nameEn.trim() || !unit || !category) return;
    if (generating) return; // block save while image is generating
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
          image_data_url: imageData,
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
    try {
      const res = await fetch("/api/admin/vegetables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: veg.id, in_stock: inStock }),
      });
      if (res.ok) {
        const d = await res.json();
        setVegetables((prev) =>
          prev.map((v) => (v.id === veg.id ? d.vegetable ?? { ...v, in_stock: inStock } : v))
        );
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to update item status.");
      }
    } catch {
      alert("Network error updating item status.");
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading…</div>;
  }

  const activeItems = vegetables.filter((v) => v.in_stock);
  const removedItems = vegetables.filter((v) => !v.in_stock);
  const displayedItems = activeTab === "active" ? activeItems : removedItems;
  const sortedItems = [...displayedItems].sort((a, b) => a.name_en.localeCompare(b.name_en));

  const renderItemForm = (isEdit: boolean) => (
    <div
      style={{
        background: isEdit ? "#eff6ff" : "#f0fdf4",
        border: `1.5px solid ${isEdit ? "#bfdbfe" : "#bbf7d0"}`,
        borderRadius: "12px",
        padding: "16px",
        marginBottom: isEdit ? "12px" : "20px",
        boxShadow: isEdit ? "0 4px 16px rgba(30, 64, 175, 0.1)" : "none",
      }}
    >
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "14px", color: isEdit ? "#1e40af" : "#166534" }}>
        {isEdit ? `Edit "${editingVeg?.name_en}"` : "Add New Item"}
      </h2>

      {/* Name fields */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {/* English Name */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
            Name (English) *{enTranslating ? " ⟳" : ""}
          </label>
          <input
            className="admin-input"
            placeholder="e.g. Tomato"
            value={nameEn}
            onFocus={() => { activeFieldRef.current = "en"; }}
            onBlur={() => { activeFieldRef.current = null; }}
            onChange={(e) => handleNameEnChange(e.target.value)}
          />
          {enAutoFilled && (
            <p style={{ fontSize: "0.68rem", color: "#6b7280", fontStyle: "italic", marginTop: "3px" }}>
              Auto-filled — tap to edit
            </p>
          )}
        </div>

        {/* Tamil Name */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
            Name (Tamil){taTranslating ? " ⟳" : ""}
          </label>
          <input
            className="admin-input"
            placeholder="தக்காளி"
            value={nameTa}
            onFocus={() => { activeFieldRef.current = "ta"; }}
            onBlur={() => { activeFieldRef.current = null; }}
            onChange={(e) => handleNameTaChange(e.target.value)}
          />
          {taAutoFilled && (
            <p style={{ fontSize: "0.68rem", color: "#6b7280", fontStyle: "italic", marginTop: "3px" }}>
              Auto-filled — tap to edit
            </p>
          )}
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
          Optional reference price shown to customers. If left empty, customers will see &quot;Out of Stock&quot; in red.
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

      {/* ── Photo Section (Gallery / Camera / Generate) ───────────────────── */}
      <div style={{ marginBottom: "14px" }}>
        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>
          Photo (optional)
        </label>

        {imageData ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageData} alt="Preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
            <button onClick={() => { setImageData(null); setImageGenError(""); }} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>
              Remove photo
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {/* Gallery button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                padding: "9px 14px",
                border: `1.5px solid ${isEdit ? "#bfdbfe" : "#bbf7d0"}`,
                borderRadius: "9999px",
                background: "#fff",
                color: isEdit ? "#1e40af" : "#166534",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <GalleryIcon /> Gallery
            </button>

            {/* Camera button */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              style={{
                padding: "9px 14px",
                border: `1.5px solid ${isEdit ? "#bfdbfe" : "#bbf7d0"}`,
                borderRadius: "9999px",
                background: "#fff",
                color: isEdit ? "#1e40af" : "#166534",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <CameraIcon /> Camera
            </button>

            {/* AI Generate button */}
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={generating || !nameEn.trim()}
              title={!nameEn.trim() ? "Enter an English name first" : "Generate a product photo with AI"}
              style={{
                padding: "9px 14px",
                border: "1.5px solid #e0d9fc",
                borderRadius: "9999px",
                background: generating ? "#f5f3ff" : "#fff",
                color: generating ? "#7c3aed" : "#6d28d9",
                cursor: generating || !nameEn.trim() ? "not-allowed" : "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                opacity: !nameEn.trim() ? 0.5 : 1,
              }}
            >
              <SparklesIcon /> {generating ? "Generating…" : "AI Generate"}
            </button>
          </div>
        )}

        {/* Image gen error (does not clear existing image) */}
        {imageGenError && (
          <p style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: "6px" }}>
            {imageGenError}
          </p>
        )}

        {/* Hidden gallery input (no capture) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />
        {/* Hidden camera input (capture=environment) */}
        <input
          ref={cameraRef}
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
          disabled={saving || generating}
          style={{
            flex: 1,
            justifyContent: "center",
            background: isEdit ? "#1e40af" : "#166534",
            opacity: generating ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : generating ? "Wait (generating image…)" : isEdit ? "Save Changes" : "Save Item"}
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
  );

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

      {/* Top Form (only shown for Add New) */}
      {showAdd && !editingVeg && renderItemForm(false)}

      {/* Items list */}
      {sortedItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#9ca3af", fontSize: "0.9rem" }}>
          {activeTab === "active"
            ? "No active items in catalog."
            : "No removed items in archive."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sortedItems.map((veg) =>
            editingVeg?.id === veg.id ? (
              <div key={veg.id}>
                {renderItemForm(true)}
              </div>
            ) : (
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
            )
          )}
        </div>
      )}
    </div>
  );
}
