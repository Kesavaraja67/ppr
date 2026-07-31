"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function StoreItemsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#1A6B47" : "#718096"}
      strokeWidth={active ? "2.2" : "1.8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MyOrdersIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#1A6B47" : "#718096"}
      strokeWidth={active ? "2.2" : "1.8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ShopInfoIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#1A6B47" : "#718096"}
      strokeWidth={active ? "2.2" : "1.8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#1A6B47" : "#718096"}
      strokeWidth={active ? "2.2" : "1.8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  // Hide bottom navigation on staff admin pages (/manage/*)
  if (pathname === "/manage" || pathname.startsWith("/manage/")) {
    return null;
  }

  const tabs = [
    {
      href: "/",
      label: "Items",
      icon: StoreItemsIcon,
      isActive: pathname === "/",
    },
    {
      href: "/orders",
      label: "My Orders",
      icon: MyOrdersIcon,
      isActive: pathname.startsWith("/orders"),
    },
    {
      href: "/shop-details",
      label: "Shop Details",
      icon: ShopInfoIcon,
      isActive: pathname === "/shop-details",
    },
    {
      href: "/login",
      label: "Account",
      icon: AccountIcon,
      isActive: pathname === "/login",
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "500px",
        height: "64px",
        background: "rgba(255, 255, 255, 0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        borderTopLeftRadius: "22px",
        borderTopRightRadius: "22px",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.06)",
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 8px",
      }}
    >
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              height: "100%",
              color: tab.isActive ? "#1A6B47" : "#718096",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3px 12px",
                borderRadius: "9999px",
                background: tab.isActive ? "#E6F4EE" : "transparent",
                transition: "background 0.15s ease",
              }}
            >
              <IconComponent active={tab.isActive} />
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: tab.isActive ? 700 : 500,
                fontFamily: "var(--font)",
                letterSpacing: "-0.01em",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
