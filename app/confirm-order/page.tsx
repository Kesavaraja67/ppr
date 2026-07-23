"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrderList } from "@/components/OrderListProvider";
import { haversineDistance } from "@/lib/haversine";

interface SavedAddress {
  id: string;
  full_address: string;
  lat: number;
  long: number;
  is_within_range: boolean;
}

export default function ConfirmOrderPage() {
  const router = useRouter();
  const { items, setQty, removeItem, clearAll } = useOrderList();

  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddressText, setNewAddressText] = useState("");
  const [newAddressCoords, setNewAddressCoords] = useState<{ lat: number; long: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [shopCoords, setShopCoords] = useState<{ lat: number; long: number; radius: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Auth check on mount — redirect to /login if not signed in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setLoggedIn(!!d.loggedIn);
        setAuthChecked(true);
        // Pre-fill name for returning customers
        if (d.name) setCustomerName(d.name);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Load shop config for haversine validation
  useEffect(() => {
    fetch("/api/shop-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.lat) {
          setShopCoords({
            lat: Number(d.lat),
            long: Number(d.long),
            radius: Number(d.delivery_radius_km) || 3,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Load user's saved addresses
  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.addresses?.length) {
          setSavedAddresses(d.addresses);
          setSelectedAddressId(d.addresses[0].id);
        } else {
          setShowNewAddress(true);
        }
      })
      .catch(() => {});
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewAddressCoords({ lat: pos.coords.latitude, long: pos.coords.longitude });
        setLocationError("");
      },
      () => {
        setLocationError("Could not get your location. Please try again or enter address manually.");
      }
    );
  };

  const isWithinRange = () => {
    if (!shopCoords || !newAddressCoords) return false;
    const d = haversineDistance(newAddressCoords.lat, newAddressCoords.long, shopCoords.lat, shopCoords.long);
    return d <= shopCoords.radius;
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;

    // Validate name
    if (!customerName.trim()) {
      setSubmitError("Please enter your name before placing the order.");
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (item.qty < 1) {
        setSubmitError(`Minimum 1 unit required for ${item.name_en}`);
        return;
      }
    }

    let addressPayload: {
      address_id?: string;
      new_address?: { full_address: string; lat: number; long: number; is_within_range: boolean };
    };

    if (showNewAddress) {
      if (!newAddressText.trim()) {
        setSubmitError("Please enter your delivery address.");
        return;
      }
      if (!newAddressCoords) {
        setSubmitError("Please tap 'Use my location' to pin your delivery location.");
        return;
      }
      const withinRange = isWithinRange();
      if (!withinRange) {
        setSubmitError(
          `Sorry, your location is outside our 3km delivery zone. Please call ${shopCoords ? "" : "the shop"} to discuss options.`
        );
        return;
      }
      addressPayload = {
        new_address: {
          full_address: newAddressText.trim(),
          lat: newAddressCoords.lat,
          long: newAddressCoords.long,
          is_within_range: true,
        },
      };
    } else {
      if (!selectedAddressId) {
        setSubmitError("Please select a delivery address.");
        return;
      }
      addressPayload = { address_id: selectedAddressId };
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addressPayload,
          name: customerName.trim(),
          items: items.map((i) => ({
            veg_id: i.veg_id,
            qty: i.qty,
            unit: i.unit,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to place order. Please try again.");
        return;
      }

      clearAll();
      router.replace(`/orders/${data.orderId}/confirmed`);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Auth gate — show spinner until auth checked, then gate if not logged in
  if (!authChecked) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#9ca3af" }}>
        Loading…
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          textAlign: "center",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "9999px",
            background: "#f0fdf4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "10px" }}>
          Sign in to place your order
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.88rem", maxWidth: "280px", lineHeight: 1.6, marginBottom: "28px" }}>
          We need your mobile number to confirm delivery and keep track of your orders.
        </p>
        <Link
          href="/login?next=/confirm-order"
          className="btn-accent"
          style={{ display: "inline-flex", justifyContent: "center", minWidth: "200px" }}
        >
          Sign in with OTP
        </Link>
        <Link
          href="/"
          style={{
            marginTop: "12px",
            fontSize: "0.85rem",
            color: "#9ca3af",
          }}
        >
          ← Back to catalog
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "1.1rem", color: "#6b7280", marginBottom: "20px" }}>
          Your order list is empty.
        </p>
        <Link href="/" className="btn-accent" style={{ display: "inline-flex" }}>
          Browse catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <header
        style={{
          padding: "16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>
          ←
        </button>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Confirm Order</h1>
      </header>

      <div style={{ padding: "16px" }}>
        {/* Order info */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "20px",
            fontSize: "0.83rem",
            color: "#166534",
          }}
        >
          All orders are for <strong>next-day delivery</strong>. You can cancel by <strong>10:00 PM today</strong>.
        </div>

        {/* Customer Name */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "10px" }}>Your Name</h2>
        <div style={{ marginBottom: "24px" }}>
          <input
            id="customer-name"
            type="text"
            placeholder="e.g. Rajan Murugesan"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoComplete="name"
            className="admin-input"
            style={{
              borderColor: !customerName.trim() && submitError ? "#dc2626" : undefined,
            }}
          />
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "5px" }}>
            So we can address your order correctly.
          </p>
        </div>

        {/* Items list */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
          Your Order List
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {items.map((item) => (
            <div
              key={item.veg_id}
              className="product-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name_en}</p>
                <p style={{ color: "#6b7280", fontSize: "0.78rem" }}>{item.name_ta} · per {item.unit}</p>
              </div>

              {/* Qty controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setQty(item.veg_id, item.qty - 1)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "9999px",
                    border: "1.5px solid #e5e7eb",
                    background: "#fff",
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <span style={{ fontWeight: 700, minWidth: "20px", textAlign: "center" }}>
                  {item.qty}
                </span>
                <button
                  onClick={() =>
                    setQty(item.veg_id, item.qty + 1, {
                      name_en: item.name_en,
                      name_ta: item.name_ta,
                      unit: item.unit,
                      image_url: item.image_url,
                    })
                  }
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "9999px",
                    background: "#166534",
                    color: "#fff",
                    border: "none",
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>

              <button
                onClick={() => removeItem(item.veg_id)}
                style={{ color: "#dc2626", background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", padding: "4px" }}
                aria-label={`Remove ${item.name_en}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Address section */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
          Delivery Address
        </h2>

        {savedAddresses.length > 0 && !showNewAddress && (
          <div style={{ marginBottom: "16px" }}>
            {savedAddresses.map((addr) => (
              <label
                key={addr.id}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "12px",
                  border: `1.5px solid ${selectedAddressId === addr.id ? "#166534" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  background: selectedAddressId === addr.id ? "#f0fdf4" : "#fff",
                }}
              >
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  style={{ marginTop: "2px", accentColor: "#166534" }}
                />
                <div>
                  <p style={{ fontSize: "0.87rem", fontWeight: 600 }}>{addr.full_address}</p>
                  {!addr.is_within_range && (
                    <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                      ⚠ Outside delivery zone
                    </p>
                  )}
                </div>
              </label>
            ))}
            <button
              onClick={() => setShowNewAddress(true)}
              style={{
                color: "#166534",
                background: "none",
                border: "1.5px dashed #bbf7d0",
                borderRadius: "10px",
                padding: "12px",
                width: "100%",
                cursor: "pointer",
                fontSize: "0.87rem",
                fontWeight: 600,
              }}
            >
              + Add new address
            </button>
          </div>
        )}

        {showNewAddress && (
          <div style={{ marginBottom: "16px" }}>
            <textarea
              placeholder="Your full delivery address (house no., street, area)"
              value={newAddressText}
              onChange={(e) => setNewAddressText(e.target.value)}
              className="admin-input"
              rows={3}
              style={{ marginBottom: "10px", resize: "none" }}
            />
            <button
              onClick={getLocation}
              style={{
                width: "100%",
                padding: "12px",
                background: newAddressCoords ? "#f0fdf4" : "#166534",
                color: newAddressCoords ? "#166534" : "#fff",
                border: newAddressCoords ? "1.5px solid #bbf7d0" : "none",
                borderRadius: "9999px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                marginBottom: "8px",
              }}
            >
              {newAddressCoords
                ? `Location pinned (${newAddressCoords.lat.toFixed(4)}, ${newAddressCoords.long.toFixed(4)})`
                : "Use my current location"}
            </button>
            {locationError && (
              <p style={{ color: "#dc2626", fontSize: "0.8rem" }}>{locationError}</p>
            )}
            {newAddressCoords && shopCoords && !isWithinRange() && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "12px",
                  color: "#dc2626",
                  fontSize: "0.85rem",
                }}
              >
                <strong>Outside our 3km delivery zone.</strong> Please call the shop to discuss options.
              </div>
            )}
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              padding: "12px",
              color: "#dc2626",
              fontSize: "0.85rem",
              marginBottom: "16px",
            }}
          >
            {submitError}
          </div>
        )}
      </div>

      {/* Sticky submit bar */}
      <div className="sticky-bar">
        <button
          className="btn-accent"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Placing order…" : "Place Order for Tomorrow"}
        </button>
      </div>
    </div>
  );
}
