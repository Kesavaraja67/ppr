"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useOrderList } from "./OrderListProvider";

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface ShopConfig {
  shop_name: string;
  owner_name: string;
  phone_number: string;
  lat: number;
  long: number;
  delivery_radius_km: number;
  covered_areas: string[];
}

interface Props {
  vegetables: Vegetable[];
  config: ShopConfig | null;
}

// ── Product card color palette ────────────────────────────────────────────────
// Colors are deterministic per product — stable across filter changes
// Palette: cohesive nature-inspired pastels — no jarring hue jumps between adjacent cards
const CARD_COLORS = [
  { bg: "#F0F7F2", circle: "#C8E6CF" },  // mint green
  { bg: "#F5F9EC", circle: "#D9EDBB" },  // lime mist
  { bg: "#FBF8F0", circle: "#EDE0BC" },  // warm cream
  { bg: "#F2F7F4", circle: "#BDD9CA" },  // sage
  { bg: "#F8F5F0", circle: "#E8D9C4" },  // sand beige
  { bg: "#EFF6F2", circle: "#B8DEC9" },  // pale teal
  { bg: "#F9F6EE", circle: "#E4D5A9" },  // honey cream
  { bg: "#F2F9F5", circle: "#C0E2D2" },  // seafoam
  { bg: "#F7F4EF", circle: "#DDD0B5" },  // warm linen
  { bg: "#EEF6F0", circle: "#BBDCC8" },  // soft moss
  { bg: "#FAFAF2", circle: "#E2E8B5" },  // citrus mist
  { bg: "#F0F5F7", circle: "#BDD4DC" },  // pale sky
];

function hashIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % CARD_COLORS.length;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function LeafIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.9.9 7.1A5 5 0 0 1 12 20z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z" />
    </svg>
  );
}

function LaptopIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function ShareSquareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function OrderIconWhite() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

// ── Step icons for How it works ────────────────────────────────────────────────
const STEPS = [
  {
    label: "Browse & add to list",
    desc: "Pick your fresh produce",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    label: "Order within 8am to 8pm",
    desc: "We confirm every night before 8 PM",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Delivered tomorrow",
    desc: "Fresh to your door, next morning",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Pay on delivery",
    desc: "Cash on arrival — no advance payment",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

// ── Piece Stepper (+1 / -1, whole numbers only) ──────────────────────────────
function PieceStepper({
  qty,
  onDecrement,
  onIncrement,
}: {
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#1A6B47",
        borderRadius: "9999px",
        height: "40px",
        width: "100%",
        overflow: "hidden",
        padding: "0 4px",
      }}
    >
      <button
        onClick={onDecrement}
        type="button"
        aria-label="Decrease quantity"
        style={{
          width: "40px",
          height: "100%",
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: "1.3rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: "var(--font)",
        }}
      >
        −
      </button>

      <span
        style={{
          color: "#fff",
          fontSize: "0.95rem",
          fontWeight: 700,
          fontFamily: "var(--font)",
          minWidth: "24px",
          textAlign: "center",
        }}
      >
        {qty}
      </span>

      <button
        onClick={onIncrement}
        type="button"
        aria-label="Increase quantity"
        style={{
          width: "40px",
          height: "100%",
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: "1.3rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: "var(--font)",
        }}
      >
        +
      </button>
    </div>
  );
}

function parseRawWeightInput(rawStr: string): { kg: number; isValid: boolean } {
  const val = parseFloat(rawStr);
  if (isNaN(val) || val <= 0) return { kg: 0, isValid: false };
  // If user enters 10 or greater (e.g. 100, 250, 500, 1000), interpret as grams
  if (val >= 10) {
    const kg = val / 1000;
    return { kg, isValid: kg >= 0.05 };
  }
  // Otherwise interpret as kilograms (e.g. 0.1, 0.25, 0.5, 1, 1.5)
  return { kg: val, isValid: val >= 0.05 };
}

function formatWeightDisplay(kg: number): string {
  if (kg <= 0) return "";
  const grams = Math.round(kg * 1000);
  if (kg >= 1) {
    const formattedKg = Number.isInteger(kg) ? String(kg) : String(parseFloat(kg.toFixed(2)));
    return `${grams}g / ${formattedKg}kg`;
  }
  return `${grams}g`;
}

// ── Kg Input Bar (typable numeric input, NO +/- buttons) ─────────────────────
function KgInputBar({
  qty,
  onQuantityChange,
  onRemove,
}: {
  qty: number;
  onQuantityChange: (newQty: number) => void;
  onRemove: () => void;
}) {
  const [prevQty, setPrevQty] = useState(qty);
  const [inputValue, setInputValue] = useState<string>(() => (qty > 0 ? String(qty) : "1"));

  if (prevQty !== qty) {
    setPrevQty(qty);
    const parsedInput = parseFloat(inputValue);
    if (isNaN(parsedInput) || parsedInput !== qty) {
      setInputValue(qty > 0 ? String(qty) : "1");
    }
  }

  const weightLabel = formatWeightDisplay(qty);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        width: "100%",
        height: "40px",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          background: "#F0FDF4",
          border: "1.5px solid #1A6B47",
          borderRadius: "9999px",
          height: "100%",
          padding: "0 8px",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0.05"
          placeholder="e.g. 500 or 1.5"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            const { kg, isValid } = parseRawWeightInput(e.target.value);
            if (isValid) {
              onQuantityChange(kg);
            }
          }}
          onBlur={() => {
            const { kg, isValid } = parseRawWeightInput(inputValue);
            if (!isValid || kg < 0.05) {
              setInputValue("0.1");
              onQuantityChange(0.1);
            } else {
              const formattedKg = parseFloat(kg.toFixed(2));
              setInputValue(String(formattedKg));
              onQuantityChange(formattedKg);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Quantity in weight"
          style={{
            flex: 1,
            width: "100%",
            minWidth: "0",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "16px",
            fontWeight: 700,
            color: "#111827",
            fontFamily: "var(--font)",
            MozAppearance: "textfield",
            WebkitAppearance: "none",
            padding: "0 2px",
          }}
        />
        {weightLabel && (
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#15803D",
              background: "#DCFCE7",
              padding: "3px 7px",
              borderRadius: "9999px",
              marginLeft: "2px",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {weightLabel}
          </span>
        )}
      </div>

      <button
        onClick={onRemove}
        type="button"
        aria-label="Remove item from cart"
        title="Remove item"
        style={{
          width: "36px",
          height: "40px",
          borderRadius: "12px",
          background: "#FEE2E2",
          border: "none",
          color: "#DC2626",
          fontSize: "1.1rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 150ms",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#FCA5A5")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#FEE2E2")}
      >
        ✕
      </button>
    </div>
  );
}

// ── Order list icon (green bg for white header) ───────────────────────────────
function OrderListIcon({ count }: { count: number }) {
  const isMounted = useIsMounted();
  const displayCount = isMounted ? count : 0;

  return (
    <button
      aria-label={`View order list — ${displayCount} item${displayCount !== 1 ? "s" : ""}`}
      style={{
        position: "relative",
        background: "#E6F4EE",
        border: "none",
        cursor: "pointer",
        padding: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        width: "44px",
        height: "44px",
        flexShrink: 0,
        transition: "background 150ms",
      }}
      onClick={() => {
        if (typeof window !== "undefined") window.location.href = "/confirm-order";
      }}
    >
      <OrderIcon />
      {displayCount > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            background: "#1A6B47",
            color: "#fff",
            fontSize: "0.6rem",
            fontWeight: 700,
            minWidth: "18px",
            height: "18px",
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            fontFamily: "var(--font)",
          }}
        >
          {displayCount > 99 ? "99+" : displayCount}
        </span>
      )}
    </button>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({
  veg,
  shopOpen,
  onOpenChoice,
}: {
  veg: Vegetable;
  shopOpen: boolean;
  onOpenChoice: (veg: Vegetable, e: React.MouseEvent) => void;
}) {
  const { items, setQty, getQty } = useOrderList();
  const isMounted = useIsMounted();
  const qty = isMounted ? getQty(veg.id) : 0;
  const cartItem = items.find((i) => i.veg_id === veg.id);
  const color = CARD_COLORS[hashIndex(veg.id)];

  const [overrideSrc, setOverrideSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Active unit based on cart item or default vegetable unit
  const activeUnit = cartItem?.unit ?? veg.unit;
  const isKg = activeUnit === "kg";

  const allowPiece = veg.allow_piece_mode ?? true;

  const handleAddToCartClick = (e: React.MouseEvent) => {
    if (!shopOpen) return;
    // Ask for unit selection on produce items that support dual-mode
    if (veg.category !== "grocery" && allowPiece) {
      onOpenChoice(veg, e);
    } else {
      // Direct add according to veg.unit (0.1 kg for weight items, 1 for piece/grocery)
      const initialQty = veg.unit === "kg" ? 0.1 : 1;
      setQty(veg.id, initialQty, {
        name_en: veg.name_en,
        name_ta: veg.name_ta,
        unit: veg.unit,
        image_url: veg.image_url,
        current_price: veg.current_price,
      });
    }
  };

  const handleIncrementPiece = () => {
    if (!shopOpen) return;
    setQty(veg.id, Math.round(qty + 1), {
      name_en: veg.name_en,
      name_ta: veg.name_ta,
      unit: activeUnit,
      image_url: veg.image_url,
    });
  };

  const handleDecrementPiece = () => {
    if (!shopOpen) return;
    const nextQty = Math.round(qty - 1);
    if (nextQty < 1) {
      setQty(veg.id, 0);
    } else {
      setQty(veg.id, nextQty, {
        name_en: veg.name_en,
        name_ta: veg.name_ta,
        unit: activeUnit,
        image_url: veg.image_url,
      });
    }
  };

  const imgSrc = overrideSrc ?? veg.image_url;

  return (
    <div
      className="product-card"
      style={{ opacity: veg.in_stock ? 1 : 0.55 }}
      aria-label={`${veg.name_en} — ${veg.name_ta}`}
    >
      {/* Colored image area */}
      <div
        style={{
          background: color.bg,
          height: "148px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative circle */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-28px",
            right: "-28px",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: color.circle,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />

        {imgSrc && !imgError ? (
          <Image
            src={imgSrc}
            alt={veg.name_en}
            width={110}
            height={110}
            priority={true}
            onError={() => {
              if (imgSrc.endsWith(".png")) {
                setOverrideSrc(imgSrc.replace(".png", ".jpg"));
              } else {
                setImgError(true);
              }
            }}
            style={{
              objectFit: "contain",
              maxHeight: "110px",
              maxWidth: "100%",
              height: "auto",
              width: "auto",
              position: "relative",
              zIndex: 1,
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.13))",
            }}
          />
        ) : (
          // Fallback: first-letter monogram circle
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: color.circle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "rgba(0,0,0,0.35)",
              fontFamily: "var(--font)",
              letterSpacing: "-0.02em",
            }}
            aria-hidden="true"
          >
            {veg.name_en[0].toUpperCase()}
          </div>
        )}

        {/* Out of stock overlay */}
        {!veg.in_stock && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20, 20, 20, 0.42)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
            }}
          >
            <span
              style={{
                background: "rgba(255,255,255,0.94)",
                color: "#666",
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: "var(--font)",
                padding: "4px 12px",
                borderRadius: "9999px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* White info area */}
      <div style={{ padding: "12px 14px 14px" }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            lineHeight: 1.3,
            marginBottom: "3px",
            color: "var(--text-primary)",
            fontFamily: "var(--font)",
          }}
        >
          {veg.name_en}
        </p>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.72rem",
            fontWeight: 600,
            marginBottom: "4px",
            fontFamily: "var(--font)",
          }}
        >
          {veg.name_ta} · per {activeUnit}
        </p>

        <div style={{ marginBottom: "10px", minHeight: "20px" }}>
          {veg.current_price !== undefined && veg.current_price !== null && veg.current_price !== "" && Number(veg.current_price) > 0 ? (
            <p style={{ margin: 0, fontSize: "0.86rem", fontWeight: 700, color: "#166534", fontFamily: "var(--font)" }}>
              ₹{Number(veg.current_price).toFixed(0)}{" "}
              <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--text-muted)" }}>
                / {veg.unit}
              </span>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "0.72rem", fontStyle: "italic", color: "#888888", fontFamily: "var(--font)" }}>
              Price will be updated soon
            </p>
          )}
        </div>

        {veg.in_stock ? (
          qty === 0 ? (
            <>
              <button
                onClick={handleAddToCartClick}
                style={{
                  width: "100%",
                  height: "40px",
                  background: "#1A6B47",
                  color: "#fff",
                  border: "none",
                  borderRadius: "9999px",
                  fontFamily: "var(--font)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 150ms",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#124D33")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#1A6B47")}
              >
                <PlusIcon />
                Add to Cart
              </button>
            </>
          ) : isKg ? (
            <KgInputBar
              qty={qty}
              onQuantityChange={(newQty) =>
                setQty(veg.id, newQty, {
                  name_en: veg.name_en,
                  name_ta: veg.name_ta,
                  unit: activeUnit,
                  image_url: veg.image_url,
                })
              }
              onRemove={() => setQty(veg.id, 0)}
            />
          ) : (
            <PieceStepper
              qty={qty}
              onDecrement={handleDecrementPiece}
              onIncrement={handleIncrementPiece}
            />
          )
        ) : null}
      </div>
    </div>
  );
}

// ── Shop hours utility ────────────────────────────────────────────────────────
/** Returns true if current IST time is within the 8 AM–8 PM ordering window. */
function isWithinOrderWindow(): boolean {
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const h = nowIST.getHours();
  return h >= 8 && h < 20;
}

const emptySubscribe = () => () => { };

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function useIsStandalone(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof window === "undefined") return false;
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true
      );
    },
    () => false
  );
}

function useDeviceType(): "desktop" | "android" | "ios" | "other" {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof window === "undefined") return "other";
      const ua = navigator.userAgent.toLowerCase();
      const isIos =
        /iphone|ipad|ipod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isAndroid = /android/.test(ua);
      const isMobile = isIos || isAndroid || /mobile/.test(ua);
      if (isIos) return "ios";
      if (isAndroid) return "android";
      if (!isMobile) return "desktop";
      return "other";
    },
    () => "other"
  );
}

// ── Main Catalog ──────────────────────────────────────────────────────────────
export default function CatalogClient({ vegetables: allVegs, config }: Props) {
  const router = useRouter();
  const { totalCount } = useOrderList();

  type Category = "all" | "vegetable" | "fruit" | "grocery";

  const [category, setCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deviceType = useDeviceType();
  const isStandalone = useIsStandalone();
  const [showIosModal, setShowIosModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  const [shopOpen, setShopOpen] = useState(isWithinOrderWindow);
  const [isScrolled, setIsScrolled] = useState(false);
  const [choiceVeg, setChoiceVeg] = useState<Vegetable | null>(null);
  const { setQty } = useOrderList();

  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const openChoiceModal = (veg: Vegetable, e?: React.MouseEvent) => {
    if (!shopOpen) return;
    if (e) {
      triggerRef.current = e.currentTarget as HTMLElement;
    } else {
      triggerRef.current = document.activeElement as HTMLElement;
    }
    setChoiceVeg(veg);
  };

  // Scroll listener for collapsible header
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > 110) {
        setIsScrolled(true);
      } else if (y < 20) {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-close modal and prevent selection if shop hours change to closed
  useEffect(() => {
    const updateShopStatus = () => {
      const open = isWithinOrderWindow();
      setShopOpen(open);
      if (!open) {
        setChoiceVeg(null);
      }
    };
    updateShopStatus();
    const id = setInterval(updateShopStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  // Modal accessibility: Focus management, focus trap, Escape key handling, and restoring focus
  useEffect(() => {
    if (!choiceVeg) {
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
      return;
    }

    const timer = setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setChoiceVeg(null);
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === modalRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [choiceVeg]);



  // PWA install listener (runs only when not standalone)
  useEffect(() => {
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deviceType === "ios") {
      setShowIosModal(true);
      return;
    }

    if (deferredPrompt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deferredPrompt as any).prompt();
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  };

  // Filter + search
  const filtered = allVegs
    .filter((v) => category === "all" || v.category === category)
    .filter(
      (v) =>
        !searchQuery ||
        v.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name_ta.includes(searchQuery)
    );

  const categories: Array<{ id: Category; label: string }> = [
    { id: "all", label: "All Items" },
    { id: "vegetable", label: "Vegetables" },
    { id: "fruit", label: "Fruits" },
    { id: "grocery", label: "Groceries" },
  ];

  const activeLabel = categories.find((c) => c.id === category)?.label ?? "Fresh Picks";

  return (
    <div className="page-content">

      {/* ── Premium Sticky Header (Search bar remains pinned at top) ─────────── */}
      <header
        className={`catalog-header ${isScrolled ? "is-scrolled" : ""}`}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 90,
          background: isScrolled ? "rgba(255, 255, 255, 0.94)" : "var(--bg)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          padding: isScrolled ? "12px 16px 14px" : "16px 16px 14px",
          borderBottomLeftRadius: isScrolled ? "22px" : "0px",
          borderBottomRightRadius: isScrolled ? "22px" : "0px",
          boxShadow: isScrolled ? "0 8px 24px rgba(0, 0, 0, 0.08)" : "none",
          borderBottom: isScrolled ? "1px solid rgba(0, 0, 0, 0.08)" : "none",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Collapsible Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxHeight: isScrolled ? "0px" : "68px",
            opacity: isScrolled ? 0 : 1,
            marginBottom: isScrolled ? "0px" : "14px",
            overflow: "hidden",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <a
            href="/manage"
            aria-label="Staff login"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png?v=6"
                alt="P.P.R. Fruits & Vegetables Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
            <div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.65rem",
                  fontFamily: "var(--font)",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                Fresh daily · Coimbatore
              </p>
              <h1
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  fontFamily: "var(--font)",
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                P.P.R. Fruits &amp; Vegetables
              </h1>
            </div>
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", alignSelf: "center" }}>
            {!isStandalone && (canInstall || deviceType === "ios") && (
              <button
                onClick={handleInstallClick}
                aria-label="Install App"
                style={{
                  fontSize: "0.74rem",
                  padding: "7px 14px",
                  background: "#E6F4EE",
                  color: "#1A6B47",
                  border: "1.5px solid #C3E6D0",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {deviceType === "desktop" ? <LaptopIcon size={14} /> : <PhoneIcon size={13} />}
                {deviceType === "desktop" ? "Install App" : "Install"}
              </button>
            )}
            <OrderListIcon count={totalCount} />
          </div>
        </div>

        {/* Search bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: isScrolled ? "#F0F4F2" : "#F5F7F6",
            borderRadius: "16px",
            padding: "11px 16px",
            border: "1.5px solid var(--border)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search vegetables, fruits…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--font)",
              fontSize: "0.88rem",
              color: "var(--text-primary)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              style={{
                background: "var(--border-md)",
                border: "none",
                cursor: "pointer",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </header>

      {/* ── Category Pills ───────────────────────────────────────────────── */}
      <div className="cat-pill-row">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`cat-pill${category === cat.id ? " active" : ""}`}
            onClick={() => setCategory(cat.id)}
            aria-pressed={category === cat.id}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Collapsible Banners Container (Shop Closed & Freshness) ───────────────────── */}
      <div
        style={{
          maxHeight: isScrolled ? "0px" : "300px",
          opacity: isScrolled ? 0 : 1,
          overflow: "hidden",
          pointerEvents: isScrolled ? "none" : "auto",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* ── Shop closed banner (Bilingual) ────────────────────────────────── */}
        {!shopOpen && (
          <div
            role="status"
            aria-live="polite"
            style={{
              margin: "0 16px 12px",
              padding: "14px 16px",
              background: "#FFF9F0",
              border: "1.5px solid #FDE68A",
              borderRadius: "16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <ClockIcon />
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#92400E", fontFamily: "var(--font)", lineHeight: 1.35 }}>
                Orders accepted 8 AM – 8 PM only. Please come back during shop hours.
              </p>
              <p style={{ fontSize: "0.78rem", color: "#B45309", fontFamily: "var(--font)", marginTop: "4px", lineHeight: 1.4 }}>
                காலை 8 மணி முதல் இரவு 8 மணி வரை மட்டும் ஆர்டர் ஏற்றுக்கொள்ளப்படும். கடை நேரத்தில் மீண்டும் வருகை தரவும்.
              </p>
            </div>
          </div>
        )}

        {/* ── Freshness Positioning Banner (Bilingual) ────────────────────── */}
        <div
          style={{
            margin: "0 16px 8px",
            padding: "14px 16px",
            background: "#E6F4EE",
            border: "1.5px solid #C3E6D0",
            borderRadius: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <LeafIcon size={20} color="#1A6B47" />
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1A6B47", fontFamily: "var(--font)", lineHeight: 1.35 }}>
              Fresh, daily-bought — never stocked. We buy for your order, not from a warehouse.
            </p>
            <p style={{ fontSize: "0.78rem", color: "#2F855A", fontFamily: "var(--font)", marginTop: "4px", lineHeight: 1.4 }}>
              உங்கள் ஆர்டருக்காகவே தினமும் புதிதாக வாங்குகிறோம். முன்கூட்டியே சேமித்து வைக்கப்படுவதில்லை.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section Header ──────────────────────────────────────────────── */}
      <div
        style={{
          padding: "20px 16px 12px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              fontFamily: "var(--font)",
              color: "var(--text-primary)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {searchQuery ? `Results for "${searchQuery}"` : activeLabel}
          </h2>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font)",
              marginTop: "3px",
            }}
          >
            {filtered.length} item{filtered.length !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <a
          href={`tel:${config?.phone_number}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#E6F4EE",
            color: "#1A6B47",
            padding: "9px 15px",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            fontFamily: "var(--font)",
            flexShrink: 0,
            border: "1.5px solid #C3E6D0",
          }}
        >
          <PhoneIcon size={14} />
          Call Shop
        </a>
      </div>

      {/* ── Product Grid ─────────────────────────────────────────────────── */}
      <main
        id="product-grid"
        className="product-grid-responsive"
      >
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "64px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#F5F5F5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p
              style={{
                fontFamily: "var(--font)",
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              {searchQuery ? "No results found" : "Nothing here yet"}
            </p>
            <p
              style={{
                fontFamily: "var(--font)",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
              }}
            >
              {searchQuery
                ? "Try a different search term"
                : "Check back soon for fresh stock"}
            </p>
          </div>
        ) : (
          filtered.map((veg) => (
            <ProductCard
              key={veg.id}
              veg={veg}
              shopOpen={shopOpen}
              onOpenChoice={openChoiceModal}
            />
          ))
        )}
      </main>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section style={{ padding: "40px 16px 16px" }}>
        <h2
          style={{
            fontFamily: "var(--font)",
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: "16px",
          }}
        >
          How it works
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {STEPS.map((step, i) => (
            <div key={i} className="step-card">
              <div className="step-icon">{step.icon}</div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    fontFamily: "var(--font)",
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </p>
                <p
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font)",
                    marginTop: "2px",
                  }}
                >
                  {step.desc}
                </p>
              </div>
              <div className="step-number" aria-hidden="true">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Delivery Coverage ────────────────────────────────────────────── */}
      {(() => {
        const DEFAULT_COVERED_AREAS = [
          "Thudiyalur",
          "Vadamadurai (K. Vadamadurai)",
          "Sengalipalayam",
          "Thoppampatti Pirivu",
          "Maruthi Nagar",
        ];
        const areasToDisplay = DEFAULT_COVERED_AREAS;

        return (
          <section style={{ padding: "8px 16px 24px" }}>
            <div
              style={{
                background: "#F5F7F6",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    background: "#1A6B47",
                    borderRadius: "9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  <PinIcon />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font)",
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Delivery Coverage &amp; Policy
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font)",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {config?.delivery_radius_km ?? 3}km radius delivery area
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  marginBottom: "14px",
                }}
              >
                <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--font)", lineHeight: 1.35 }}>
                  We deliver within {config?.delivery_radius_km ?? 3}km. For larger orders or delivery outside this range, please call us directly.
                </p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontFamily: "var(--font)", marginTop: "4px", lineHeight: 1.4 }}>
                  நாங்கள் {config?.delivery_radius_km ?? 3} கிமீ சுற்றளவிற்குள் மட்டுமே டெலிவரி செய்கிறோம். பெரிய ஆர்டர்கள் அல்லது இதற்கு அப்பால் டெலிவரி தேவைப்பட்டால், நேரடியாக எங்களை அழைக்கவும்.
                </p>
                <a
                  href={`tel:${config?.phone_number || "6382366080"}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "10px",
                    background: "#E6F4EE",
                    color: "#1A6B47",
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    fontFamily: "var(--font)",
                    textDecoration: "none",
                    border: "1px solid #C3E6D0",
                  }}
                >
                  <PhoneIcon size={14} /> Call Shop: {config?.phone_number || "63823 66080"}
                </a>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {areasToDisplay.map((area) => (
                  <span
                    key={area}
                    style={{
                      background: "#E6F4EE",
                      color: "#1A6B47",
                      fontSize: "0.74rem",
                      fontFamily: "var(--font)",
                      fontWeight: 600,
                      padding: "5px 12px",
                      borderRadius: "9999px",
                      border: "1px solid #C3E6D0",
                    }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: "24px 16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LeafIcon size={14} color="#1A6B47" />
          <p
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              fontFamily: "var(--font)",
              color: "var(--text-secondary)",
            }}
          >
            {config?.shop_name ?? "P.P.R. Fruits & Vegetables"}
          </p>
        </div>
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font)",
          }}
          suppressHydrationWarning
        >
          © {new Date().getFullYear()}
          {"  ·  "}
          <a href="/sell-to-us" style={{ color: "#1A6B47", fontWeight: 500 }}>
            Sell to us
          </a>
        </p>
      </footer>

      {/* ── Sticky Order Bar ─────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="sticky-bar">
          <button
            className="btn-accent"
            style={{
              width: "100%",
              justifyContent: "space-between",
              padding: "15px 20px",
            }}
            onClick={() => router.push("/confirm-order")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <OrderIconWhite />
              Review Order
            </div>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "9999px",
                padding: "3px 12px",
                fontSize: "0.8rem",
                fontWeight: 700,
                fontFamily: "var(--font)",
              }}
            >
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </span>
          </button>
        </div>
      )}
      {/* ── iOS PWA Installation Guide Modal ────────────────────────────────────── */}
      {showIosModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#ffffff",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "24px",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <PhoneIcon size={18} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font)", color: "var(--text-primary)" }}>
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: "4px" }}
              >
                <CloseIcon />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.4 }}>
              Follow these simple steps in Safari to install PPR Fruits &amp; Vegetables on your home screen:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#F9FAFB", padding: "12px", borderRadius: "14px", border: "1px solid #E5E7EB" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#E6F4EE", color: "#1A6B47", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  1
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Tap the <ShareSquareIcon size={16} /> <strong>Share</strong> icon in Safari bottom bar.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#F9FAFB", padding: "12px", borderRadius: "14px", border: "1px solid #E5E7EB" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#E6F4EE", color: "#1A6B47", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  2
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#F9FAFB", padding: "12px", borderRadius: "14px", border: "1px solid #E5E7EB" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#E6F4EE", color: "#1A6B47", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  3
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Tap <strong>Add</strong> in the top right corner.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              style={{
                width: "100%",
                padding: "14px",
                background: "#1A6B47",
                color: "#fff",
                border: "none",
                borderRadius: "9999px",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Global Top-Level Unit Choice Modal ─────────────────────────────── */}
      {choiceVeg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setChoiceVeg(null)}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="choice-modal-title"
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "340px",
              padding: "22px 20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              textAlign: "left",
              outline: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3
                  id="choice-modal-title"
                  style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font)" }}
                >
                  {choiceVeg.name_en}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#6B7280", margin: "2px 0 0", fontFamily: "var(--font)" }}>
                  {choiceVeg.name_ta}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChoiceVeg(null)}
                aria-label="Close unit selection"
                style={{
                  border: "none",
                  background: "#F3F4F6",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  fontSize: "1rem",
                  color: "#6B7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", margin: 0, fontFamily: "var(--font)" }}>
              Select Order Unit / அளவு தேர்வு செய்க:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  if (!shopOpen || !choiceVeg) {
                    setChoiceVeg(null);
                    return;
                  }
                  const veg = choiceVeg;
                  setChoiceVeg(null);
                  setQty(veg.id, 0.1, {
                    name_en: veg.name_en,
                    name_ta: veg.name_ta,
                    unit: "kg",
                    image_url: veg.image_url,
                    current_price: veg.current_price,
                  });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "#F0FDF4",
                  border: "2px solid #1A6B47",
                  borderRadius: "16px",
                  color: "#166534",
                  fontSize: "0.92rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                }}
              >
                <span>⚖️ By Weight / எடை</span>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", padding: "4px 8px", borderRadius: "9999px" }}>
                  g / kg
                </span>
              </button>

              {(choiceVeg.allow_piece_mode ?? true) && (
                <button
                  type="button"
                  onClick={() => {
                    if (!shopOpen || !choiceVeg) {
                      setChoiceVeg(null);
                      return;
                    }
                    const veg = choiceVeg;
                    setChoiceVeg(null);
                    setQty(veg.id, 1, {
                      name_en: veg.name_en,
                      name_ta: veg.name_ta,
                      unit: "piece",
                      image_url: veg.image_url,
                      current_price: veg.current_price,
                    });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: "#F9FAFB",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: "16px",
                    color: "#1F2937",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "var(--font)",
                  }}
                >
                  <span>🧩 By Piece / எண்ணிக்கை</span>
                  <span style={{ fontSize: "0.72rem", background: "#E5E7EB", padding: "4px 8px", borderRadius: "9999px" }}>
                    Count
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
