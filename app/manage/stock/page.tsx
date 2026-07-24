import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, vegetables, supplier_requests } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

function OrdersIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function LeafIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.9.9 7.1A5 5 0 0 1 12 20z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function InboxIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function SettingsIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 8.6 15a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 15 8.6a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83z" />
    </svg>
  );
}

export default async function AdminDashboardPage() {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) redirect("/manage");

  // Count tomorrow's pending orders
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const tomorrow = new Date(nowIST);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const pendingOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.delivery_date, tomorrowStr), eq(orders.status, "pending")));

  const vegCount = await db
    .select({ id: vegetables.id })
    .from(vegetables)
    .where(eq(vegetables.in_stock, true));

  const unseenSuppliers = await db
    .select({ id: supplier_requests.id })
    .from(supplier_requests)
    .where(eq(supplier_requests.seen, false));

  const tiles = [
    {
      href: "/manage/orders",
      icon: OrdersIcon,
      label: "Tomorrow's Orders",
      sublabel: `${pendingOrders.length} pending order${pendingOrders.length !== 1 ? "s" : ""}`,
      accent: true,
      badge: 0,
    },
    {
      href: "/manage/vegetables",
      icon: LeafIcon,
      label: "Manage Items",
      sublabel: `${vegCount.length} active item${vegCount.length !== 1 ? "s" : ""}`,
      accent: false,
      badge: 0,
    },
    {
      href: "/manage/suppliers",
      icon: InboxIcon,
      label: "Supplier Inbox",
      sublabel: unseenSuppliers.length > 0
        ? `${unseenSuppliers.length} new enquir${unseenSuppliers.length !== 1 ? "ies" : "y"}`
        : "Supplier contact requests",
      accent: false,
      badge: unseenSuppliers.length,
    },
    {
      href: "/manage/settings",
      icon: SettingsIcon,
      label: "Shop Settings",
      sublabel: "Thresholds, phone, location",
      accent: false,
      badge: 0,
    },
  ];

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>PPR Admin</h1>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "4px" }}>
            Good {nowIST.getHours() < 12 ? "morning" : nowIST.getHours() < 17 ? "afternoon" : "evening"}, Jayaraman
          </p>
        </div>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "9999px",
            border: "1.5px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: "0.8rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          View Store
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: tile.accent ? "#166534" : "#fff",
                color: tile.accent ? "#fff" : "#1a1a1a",
                borderRadius: "14px",
                border: tile.accent ? "none" : "1.5px solid #e5e7eb",
                textDecoration: "none",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: tile.accent ? "rgba(255,255,255,0.15)" : "#f0fdf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon color={tile.accent ? "#fff" : "#166534"} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "1rem" }}>{tile.label}</p>
                <p
                  style={{
                    fontSize: "0.78rem",
                    marginTop: "2px",
                    color: tile.accent ? "rgba(255,255,255,0.75)" : "#6b7280",
                  }}
                >
                  {tile.sublabel}
                </p>
              </div>
              {tile.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "44px",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    minWidth: "20px",
                    height: "20px",
                    borderRadius: "9999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                  }}
                >
                  {tile.badge}
                </span>
              )}
              <span style={{ color: tile.accent ? "rgba(255,255,255,0.6)" : "#d1d5db", fontSize: "1.2rem" }}>→</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div style={{ textAlign: "center", marginTop: "28px" }}>
        <AdminLogoutButton />
      </div>
    </div>
  );
}
