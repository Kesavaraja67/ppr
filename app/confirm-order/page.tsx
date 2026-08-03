"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrderList } from "@/components/OrderListProvider";
import { haversineDistance } from "@/lib/haversine";
import { normalizeIndianMobile } from "@/lib/auth-helpers";

interface SavedAddress {
  id: string;
  full_address: string;
  lat: number;
  long: number;
  is_within_range: boolean;
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function ConfirmOrderPage() {
  const router = useRouter();
  const { items, removeItem, clearAll } = useOrderList();

  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddressText, setNewAddressText] = useState("");
  const [newAddressCoords, setNewAddressCoords] = useState<{ lat: number; long: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [shopCoords, setShopCoords] = useState<{ lat: number; long: number; radius: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [shopOpen, setShopOpen] = useState(isWithinOrderWindow);

  // Onboarding Modal state for unauthenticated users tapping "Submit Order"
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"details" | "otp">("details");
  const [onboardPhone, setOnboardPhone] = useState("");
  const [onboardOtp, setOnboardOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  const onboardPhoneInputRef = useRef<HTMLInputElement>(null);
  const onboardOtpInputRef = useRef<HTMLInputElement>(null);

  // Load MSG91 OTP Widget with exposed methods for the onboarding modal
  useEffect(() => {
    const configuration = {
      widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
      tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
      exposeMethods: true,
      captchaRenderId: "msg91-captcha-order",
      success: () => {},
      failure: (err: unknown) => console.error("MSG91 widget error:", err),
    };
    const script = document.createElement("script");
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error global exposed by the MSG91 otp-provider script
      window.initSendOTP(configuration);
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Modal Escape key & focus handling
  useEffect(() => {
    if (!showOnboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowOnboarding(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      if (onboardingStep === "details") {
        onboardPhoneInputRef.current?.focus();
      } else {
        onboardOtpInputRef.current?.focus();
      }
    }, 50);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showOnboarding, onboardingStep]);

  function isWithinOrderWindow(): boolean {
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const h = nowIST.getHours();
    return h >= 8 && h < 20;
  }

  // Load shop config for distance check
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
      .catch(() => { });
  }, []);

  // Auth check on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setLoggedIn(!!d.loggedIn);
        if (d.loggedIn) {
          if (d.name) setCustomerName(d.name);
          if (d.phone_number) setCustomerPhone(d.phone_number);
          if (d.addresses?.length) {
            setSavedAddresses(d.addresses);
            setSelectedAddressId(d.addresses[0].id);
          } else {
            setShowNewAddress(true);
          }
        } else {
          setShowNewAddress(true);
        }
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Shop hours timer
  useEffect(() => {
    const id = setInterval(() => setShopOpen(isWithinOrderWindow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter address manually.");
      return;
    }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewAddressCoords({ lat: pos.coords.latitude, long: pos.coords.longitude });
        setLocationError("");
      },
      (err) => {
        console.warn("Geolocation permission error:", err);
        setLocationError("Could not detect location automatically. Please enter your full address manually below.");
      },
      { timeout: 10000 }
    );
  };

  const isWithinRange = () => {
    if (!shopCoords || !newAddressCoords) return false;
    const d = haversineDistance(newAddressCoords.lat, newAddressCoords.long, shopCoords.lat, shopCoords.long);
    return d <= shopCoords.radius;
  };

  // Execute order submission
  const executeOrderSubmission = async (overrideAddressPayload?: unknown) => {
    let addressPayload: unknown = overrideAddressPayload;

    if (!addressPayload) {
      if (showNewAddress) {
        if (!newAddressText.trim()) {
          setSubmitError("Please enter your delivery address.");
          return false;
        }
        if (!newAddressCoords) {
          setSubmitError("Please tap 'Use my location' to pin your delivery location.");
          return false;
        }
        // Immediate client-side UX feedback
        if (shopCoords && newAddressCoords && !isWithinRange()) {
          setSubmitError(
            `Sorry, your location is outside our ${shopCoords.radius}km delivery zone. Please call the shop at 94437 21544.`
          );
          return false;
        }

        // Call server-side POST /api/addresses for address creation and Haversine radius validation
        try {
          const addrRes = await fetch("/api/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_address: newAddressText.trim(),
              lat: newAddressCoords.lat,
              long: newAddressCoords.long,
            }),
          });
          const addrData = await addrRes.json();
          if (!addrRes.ok) {
            setSubmitError(addrData.error ?? "Failed to save delivery address.");
            return false;
          }
          addressPayload = { address_id: addrData.address.id };
        } catch {
          setSubmitError("Failed to save delivery address. Please try again.");
          return false;
        }
      } else {
        if (!selectedAddressId) {
          setSubmitError("Please select a delivery address.");
          return false;
        }
        addressPayload = { address_id: selectedAddressId };
      }
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(addressPayload as object),
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
        setSubmitting(false);
        return false;
      }

      // Order created successfully — clear order list state and navigate to confirmation
      clearAll();
      router.push(`/orders/${data.orderId}/confirmed`);
      return true;
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setSubmitting(false);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0 || submitting) return;

    if (!shopOpen) {
      setSubmitError("Orders are accepted between 8 AM and 8 PM. Please try again during shop hours.");
      return;
    }

    // Validate minimum quantities
    for (const item of items) {
      const minQty = item.unit === "kg" ? 0.5 : 1;
      if (item.qty < minQty) {
        setSubmitError(`Minimum ${minQty} ${item.unit} required for ${item.name_en}`);
        return;
      }
    }

    // If NOT logged in, trigger 2-step onboarding modal flow
    if (!loggedIn) {
      if (!customerName.trim()) {
        setSubmitError("Please enter your name.");
        return;
      }
      if (showNewAddress && !newAddressText.trim()) {
        setSubmitError("Please enter your address.");
        return;
      }
      if (showNewAddress && !newAddressCoords) {
        setSubmitError("Please tap 'Use my location' to pin your delivery location.");
        return;
      }
      setSubmitError("");
      setShowOnboarding(true);
      return;
    }

    // Logged in user — execute order submission directly
    if (!customerName.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }

    await executeOrderSubmission();
  };

  // OTP Handling inside onboarding
  const handleSendOtp = () => {
    const cleaned = normalizeIndianMobile(onboardPhone);
    if (cleaned.length !== 10) {
      setOtpError("Enter a valid 10-digit mobile number");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    // @ts-expect-error exposed by the MSG91 widget script
    window.sendOtp(
      `91${cleaned}`,
      () => {
        setOnboardingStep("otp");
        setOtpLoading(false);
        setTimeout(() => onboardOtpInputRef.current?.focus(), 50);
      },
      (err: unknown) => {
        setOtpError("Failed to send OTP. Please try again.");
        setOtpLoading(false);
        console.error(err);
      }
    );
  };

  const handleVerifyOtp = () => {
    if (!onboardOtp || onboardOtp.length < 4) {
      setOtpError("Enter the OTP code sent to your mobile");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    // @ts-expect-error exposed by the MSG91 widget script
    window.verifyOtp(
      onboardOtp,
      async (data: { message: string }) => {
        try {
          const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: data.message, name: customerName.trim() }),
          });
          const json = await res.json();
          if (!res.ok) {
            setOtpError(json.error ?? "Verification failed. Please check the OTP code.");
            setOtpLoading(false);
            return;
          }
          setLoggedIn(true);
          setShowOnboarding(false);
          await executeOrderSubmission();
        } catch {
          setOtpError("Verification failed. Please try again.");
          setOtpLoading(false);
        }
      },
      (err: unknown) => {
        setOtpError("Invalid or expired OTP code.");
        setOtpLoading(false);
        console.error(err);
      }
    );
  };

  if (!authChecked) {
    return (
      <div className="page-content" style={{ padding: "20px 16px", maxWidth: "500px", margin: "0 auto" }}>
        <div style={{ height: "24px", width: "140px", background: "#E5E7EB", borderRadius: "8px", marginBottom: "24px" }} />
        <div style={{ background: "#fff", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #E5E7EB" }}>
          <div style={{ height: "20px", width: "60%", background: "#F3F4F6", borderRadius: "6px", marginBottom: "12px" }} />
          <div style={{ height: "16px", width: "40%", background: "#F3F4F6", borderRadius: "6px" }} />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", maxWidth: "500px", margin: "0 auto" }} className="page-content">
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px", fontFamily: "var(--font)" }}>
          Your order list is empty
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "24px", fontFamily: "var(--font)" }}>
          Browse our fresh vegetables and fruits to create your order.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#1A6B47",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "9999px",
            fontWeight: 700,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          Browse fresh items
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: "500px", margin: "0 auto" }} className="page-content">
      {/* MSG91 widget captcha mount for this page */}
      <div
        id="msg91-captcha-order"
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
      />

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
          Confirm Order
        </h1>
      </div>

      {submitError && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "14px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "16px" }}>
          {submitError}
        </div>
      )}

      {/* Selected Items Summary Card */}
      <div style={{ background: "#ffffff", borderRadius: "20px", padding: "18px", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.03)", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font)", marginBottom: "12px", color: "var(--text-primary)" }}>
          Selected Items ({items.length})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item) => (
            <div key={item.veg_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.88rem" }}>
              <div>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{item.name_en}</span>{" "}
                <span style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>({item.name_ta})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: 700, color: "#1A6B47" }}>{item.qty} {item.unit}</span>
                <button
                  onClick={() => removeItem(item.veg_id)}
                  style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: "0.78rem" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Name & Address Card */}
      <div style={{ background: "#ffffff", borderRadius: "20px", padding: "18px", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.03)", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font)", marginBottom: "14px", color: "var(--text-primary)" }}>
          Delivery &amp; Customer Details
        </h2>

        {/* Full Name */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Your Full Name *
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Anand Kumar"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1.5px solid var(--border)",
              fontSize: "0.95rem",
              fontFamily: "var(--font)",
              outline: "none",
            }}
          />
        </div>

        {/* Verified Phone */}
        {customerPhone && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
              Verified Mobile Number
            </label>
            <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{customerPhone}</p>
          </div>
        )}

        {/* Saved Addresses (if returning customer) */}
        {savedAddresses.length > 0 && !showNewAddress && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase" }}>
              Select Delivery Address
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {savedAddresses.map((addr) => (
                <label
                  key={addr.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "12px",
                    border: selectedAddressId === addr.id ? "2px solid #1A6B47" : "1px solid #E5E7EB",
                    background: selectedAddressId === addr.id ? "#E6F4EE" : "#FAFAFA",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    style={{ marginTop: "3px" }}
                  />
                  <span style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.4 }}>{addr.full_address}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setShowNewAddress(true)}
              style={{ background: "none", border: "none", color: "#1A6B47", fontWeight: 700, fontSize: "0.82rem", marginTop: "8px", cursor: "pointer" }}
            >
              + Add a new address
            </button>
          </div>
        )}

        {/* New Address Input */}
        {(showNewAddress || savedAddresses.length === 0) && (
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase" }}>
              Delivery Address *
            </label>
            <textarea
              value={newAddressText}
              onChange={(e) => setNewAddressText(e.target.value)}
              placeholder="House/Door No, Street Name, Area..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                fontSize: "0.9rem",
                fontFamily: "var(--font)",
                outline: "none",
                marginBottom: "10px",
                resize: "vertical",
              }}
            />

            {/* Location detector button */}
            <div style={{ marginBottom: "12px" }}>
              <button
                type="button"
                onClick={getLocation}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  background: newAddressCoords ? "#E6F4EE" : "#F3F4F6",
                  color: newAddressCoords ? "#1A6B47" : "var(--text-primary)",
                  border: newAddressCoords ? "1.5px solid #C3E6D0" : "1.5px solid #E5E7EB",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <MapPinIcon />
                {newAddressCoords ? "✓ Location Pinned" : "Use my current location"}
              </button>
            </div>

            {locationError && (
              <p style={{ fontSize: "0.78rem", color: "#DC2626", marginBottom: "8px" }}>
                {locationError}
              </p>
            )}

            {savedAddresses.length > 0 && (
              <button
                onClick={() => setShowNewAddress(false)}
                style={{ background: "none", border: "none", color: "#6B7280", fontSize: "0.82rem", cursor: "pointer" }}
              >
                ← Back to saved addresses
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "16px",
          background: submitting ? "#A7F3D0" : "#1A6B47",
          color: "#fff",
          border: "none",
          borderRadius: "9999px",
          fontFamily: "var(--font)",
          fontWeight: 700,
          fontSize: "1rem",
          cursor: submitting ? "not-allowed" : "pointer",
          boxShadow: "0 6px 20px rgba(26,107,71,0.25)",
          transition: "all 0.15s ease",
        }}
      >
        {submitting ? "Placing Order…" : "Submit Order →"}
      </button>

      {/* 2-Step Onboarding Modal for First-Time / Logged-Out Users */}
      {showOnboarding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
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
              animation: "slideUp 0.25s ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 id="onboarding-modal-title" style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font)" }}>
                {onboardingStep === "details" ? "Step 1: Mobile Verification" : "Step 2: Enter OTP Code"}
              </h3>
              <button onClick={() => setShowOnboarding(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>

            {otpError && (
              <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#DC2626", borderRadius: "12px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "14px" }}>
                {otpError}
              </div>
            )}

            {onboardingStep === "details" ? (
              <div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Please verify your mobile number to complete your order placement.
                </p>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                    Mobile Phone Number *
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ padding: "12px 14px", background: "#F3F4F6", borderRadius: "12px", fontWeight: 700, fontSize: "0.95rem" }}>
                      +91
                    </span>
                    <input
                      ref={onboardPhoneInputRef}
                      type="tel"
                      value={onboardPhone}
                      onChange={(e) => setOnboardPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      maxLength={10}
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid var(--border)",
                        fontSize: "1rem",
                        fontWeight: 600,
                        fontFamily: "var(--font)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#1A6B47",
                    color: "#fff",
                    border: "none",
                    borderRadius: "9999px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: otpLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {otpLoading ? "Sending OTP…" : "Send Verification Code →"}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Enter the 6-digit OTP code sent to <strong>+91 {onboardPhone}</strong>.
                </p>
                <input
                  ref={onboardOtpInputRef}
                  type="text"
                  value={onboardOtp}
                  onChange={(e) => setOnboardOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "2px solid #1A6B47",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    textAlign: "center",
                    letterSpacing: "0.3em",
                    fontFamily: "var(--font)",
                    outline: "none",
                    marginBottom: "16px",
                  }}
                />

                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#1A6B47",
                    color: "#fff",
                    border: "none",
                    borderRadius: "9999px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: otpLoading ? "not-allowed" : "pointer",
                    marginBottom: "12px",
                  }}
                >
                  {otpLoading ? "Verifying & Placing Order…" : "Verify OTP & Complete Order →"}
                </button>

                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    style={{ background: "none", border: "none", color: "#1A6B47", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
