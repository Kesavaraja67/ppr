"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Address {
  id: string;
  full_address: string;
  lat: string;
  long: string;
  is_within_range: boolean;
}

interface UserProfile {
  name: string | null;
  phone_number: string | null;
  addresses: Address[];
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A6B47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
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

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrInput, setAddrInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.loggedIn) {
          setProfile(d);
          setNameInput(d.name ?? "");
        } else {
          router.replace("/login?next=/profile");
        }
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.ok) {
        setProfile((prev) => (prev ? { ...prev, name: nameInput.trim() } : null));
        setEditingName(false);
        setSuccessMsg("Name updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to update name.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async (addressId: string) => {
    if (!addrInput.trim()) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address_id: addressId, full_address: addrInput.trim() }),
      });
      if (res.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                addresses: prev.addresses.map((a) =>
                  a.id === addressId ? { ...a, full_address: addrInput.trim() } : a
                ),
              }
            : null
        );
        setEditingAddrId(null);
        setSuccessMsg("Address updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to update address.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ padding: "20px 16px" }}>
        {/* Loading skeleton matching design system */}
        <div style={{ height: "24px", width: "120px", background: "#E5E7EB", borderRadius: "8px", marginBottom: "24px" }} />
        <div style={{ background: "#fff", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #E5E7EB" }}>
          <div style={{ height: "20px", width: "60%", background: "#F3F4F6", borderRadius: "6px", marginBottom: "12px" }} />
          <div style={{ height: "16px", width: "40%", background: "#F3F4F6", borderRadius: "6px" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ padding: "16px 16px 100px", maxWidth: "500px", margin: "0 auto" }}>
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
          My Account
        </h1>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ padding: "10px 14px", background: "#E6F4EE", color: "#1A6B47", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "16px" }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#DC2626", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "20px",
          border: "1.5px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: "16px",
        }}
      >
        {/* Name Field */}
        <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <UserIcon />
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Full Name
              </span>
            </div>
            {!editingName && (
              <button
                onClick={() => setEditingName(true)}
                style={{ background: "#E6F4EE", border: "none", color: "#1A6B47", padding: "6px 12px", borderRadius: "9999px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <EditIcon /> Edit
              </button>
            )}
          </div>

          {editingName ? (
            <div style={{ marginTop: "10px" }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid #1A6B47",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font)",
                  outline: "none",
                  marginBottom: "10px",
                }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    background: "#1A6B47",
                    color: "#fff",
                    border: "none",
                    borderRadius: "9999px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save Name"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameInput(profile?.name ?? "");
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#F3F4F6",
                    color: "#4B5563",
                    border: "none",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginLeft: "28px" }}>
              {profile?.name || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>Not set</span>}
            </p>
          )}
        </div>

        {/* Phone Number Field (Read-only) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <PhoneIcon />
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Verified Mobile Number
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginLeft: "26px" }}>
            <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {profile?.phone_number ?? "Not verified"}
            </p>
            <span style={{ fontSize: "0.72rem", background: "#F3F4F6", color: "#6B7280", padding: "3px 10px", borderRadius: "9999px", fontWeight: 600 }}>
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* Addresses Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "20px",
          border: "1.5px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <MapPinIcon />
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Saved Delivery Addresses
          </h2>
        </div>

        {profile?.addresses && profile.addresses.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {profile.addresses.map((addr) => {
              const isEditingThis = editingAddrId === addr.id;
              return (
                <div
                  key={addr.id}
                  style={{
                    padding: "12px 14px",
                    background: "#F9FAFB",
                    borderRadius: "14px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  {isEditingThis ? (
                    <div>
                      <textarea
                        value={addrInput}
                        onChange={(e) => setAddrInput(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "10px",
                          border: "1.5px solid #1A6B47",
                          fontSize: "0.88rem",
                          fontFamily: "var(--font)",
                          outline: "none",
                          marginBottom: "10px",
                          resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleSaveAddress(addr.id)}
                          disabled={saving}
                          style={{
                            padding: "6px 14px",
                            background: "#1A6B47",
                            color: "#fff",
                            border: "none",
                            borderRadius: "9999px",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          {saving ? "Saving…" : "Save Address"}
                        </button>
                        <button
                          onClick={() => setEditingAddrId(null)}
                          style={{
                            padding: "6px 14px",
                            background: "#E5E7EB",
                            color: "#4B5563",
                            border: "none",
                            borderRadius: "9999px",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <p style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.45, flex: 1 }}>
                        {addr.full_address}
                      </p>
                      <button
                        onClick={() => {
                          setEditingAddrId(addr.id);
                          setAddrInput(addr.full_address);
                        }}
                        style={{
                          background: "#E6F4EE",
                          border: "none",
                          color: "#1A6B47",
                          padding: "4px 10px",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          flexShrink: 0,
                        }}
                      >
                        <EditIcon /> Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#6B7280", fontStyle: "italic" }}>
            No saved addresses yet. Addresses are saved automatically when you place your first order.
          </p>
        )}
      </div>

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        style={{
          width: "100%",
          padding: "14px",
          background: "#FEF2F2",
          border: "1.5px solid #FECACA",
          color: "#DC2626",
          borderRadius: "9999px",
          fontWeight: 700,
          fontSize: "0.9rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "background 0.15s ease",
        }}
      >
        <SignOutIcon />
        Sign Out
      </button>
    </div>
  );
}
