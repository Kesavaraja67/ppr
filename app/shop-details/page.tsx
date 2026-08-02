"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ShopConfig {
  shop_name: string;
  owner_name: string;
  phone_number: string;
  lat: number;
  long: number;
  delivery_radius_km: number;
  covered_areas: string[];
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.9.9 7.1A5 5 0 0 1 12 20z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export default function ShopDetailsPage() {
  const [config, setConfig] = useState<ShopConfig | null>(null);

  useEffect(() => {
    fetch("/api/shop-config")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setConfig(d);
      })
      .catch(() => {});
  }, []);

  const shopName = config?.shop_name ?? "P.P.R. Fruits & Vegetables";
  const ownerName = config?.owner_name ?? "Jayaraman P";
  const phone = config?.phone_number ?? "94437 21544";
  const radius = config?.delivery_radius_km ?? 3;
  const coveredAreas = config?.covered_areas?.length
    ? config.covered_areas
    : [
        "Thudiyalur",
        "Vadamadurai (K. Vadamadurai)",
        "Sengalipalayam",
        "Thoppampatti Pirivu",
        "Maruthi Nagar",
      ];

  return (
    <div className="page-content">
      {/* Header */}
      <header
        style={{
          background: "#166534",
          color: "#fff",
          padding: "24px 16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", overflow: "hidden", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png?v=6" alt="PPR Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.2 }}>
              {shopName}
            </h1>
            <p style={{ fontSize: "0.78rem", opacity: 0.85, marginTop: "2px" }}>
              Fresh Daily · Coimbatore, Tamil Nadu
            </p>
          </div>
        </div>
      </header>

      <div style={{ padding: "16px" }}>
        {/* Contact & Owner Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                Store Owner & Manager
              </p>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "2px" }}>
                {ownerName}
              </h2>
            </div>
            <a
              href={`tel:${phone}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#f0fdf4",
                color: "#166534",
                border: "1.5px solid #bbf7d0",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <PhoneIcon /> Call Shop
            </a>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#4b5563", lineHeight: 1.5 }}>
            Direct phone: <strong>{phone}</strong>
          </p>
        </div>

        {/* Operating Hours & Delivery Schedule */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <ClockIcon />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#166534" }}>
              Ordering & Delivery Schedule
            </h3>
          </div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "#374151" }}>
            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: "6px" }}>
              <span style={{ color: "#6b7280" }}>Ordering Hours:</span>
              <span style={{ fontWeight: 600 }}>24 / 7 online catalog</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: "6px" }}>
              <span style={{ color: "#6b7280" }}>Daily Order Cutoff:</span>
              <span style={{ fontWeight: 600 }}>10:00 PM every night</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Delivery Time:</span>
              <span style={{ fontWeight: 600 }}>Next morning to your doorstep</span>
            </li>
          </ul>
        </div>

        {/* Delivery Coverage */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <MapPinIcon />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#166534" }}>
              Delivery Coverage Zone
            </h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#374151", marginBottom: "8px", lineHeight: 1.5 }}>
            We deliver within a <strong>{radius} km radius</strong> of our Coimbatore store location.
          </p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
            {coveredAreas.map((area) => (
              <span
                key={area}
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  fontWeight: 600,
                }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Our Promise */}
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <LeafIcon />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#166534" }}>
              The PPR Fresh Quality Promise
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.83rem", color: "#4b5563" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <TruckIcon />
              <span><strong>Farm to Doorstep:</strong> Freshly harvested vegetables sourced directly from local farmers every night.</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <LeafIcon />
              <span><strong>Hand-Sorted Quality:</strong> Every item is checked and weighed by Jayaraman and team before dispatch.</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <PhoneIcon />
              <span><strong>Pay After Inspection:</strong> No advance payment. Inspect your fresh produce on arrival and pay cash/UPI to delivery partner.</span>
            </div>
          </div>
        </div>

        {/* Supplier Banner */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px dashed #bbf7d0",
            borderRadius: "14px",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#166534", marginBottom: "4px" }}>
            Are you a Farmer or Wholesaler?
          </h4>
          <p style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: "12px" }}>
            We buy directly from local growers in and around Coimbatore.
          </p>
          <Link
            href="/sell-to-us"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 20px",
              background: "#166534",
              color: "#fff",
              borderRadius: "9999px",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Supply Produce to Us →
          </Link>
        </div>
      </div>
    </div>
  );
}
