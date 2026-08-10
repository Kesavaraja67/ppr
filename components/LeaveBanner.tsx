"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "ppr_leave_banner_dismissed";

interface LeaveConfig {
  is_on_leave: boolean;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_message: string | null;
}

function todayISODate(): string {
  // Returns YYYY-MM-DD in IST
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function isCurrentlyOnLeave(cfg: LeaveConfig): boolean {
  if (!cfg.is_on_leave) return false;
  // If no dates set, treat as indefinitely on leave
  if (!cfg.leave_start_date && !cfg.leave_end_date) return true;
  const today = todayISODate();
  const afterStart = !cfg.leave_start_date || today >= cfg.leave_start_date;
  const beforeEnd = !cfg.leave_end_date || today <= cfg.leave_end_date;
  return afterStart && beforeEnd;
}

function buildMessage(cfg: LeaveConfig): string {
  if (cfg.leave_message) return cfg.leave_message;
  if (cfg.leave_start_date && cfg.leave_end_date) {
    return `We are on a short break from ${formatDate(cfg.leave_start_date)} to ${formatDate(cfg.leave_end_date)} — orders will resume after.`;
  }
  if (cfg.leave_end_date) {
    return `We are on a short break — orders will resume after ${formatDate(cfg.leave_end_date)}.`;
  }
  return "We are temporarily closed. We will be back soon — stay tuned!";
}

export default function LeaveBanner() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: string; until?: string }>({});

  useEffect(() => {
    // Check session-level dismissal first to avoid flicker
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore if storage unavailable
    }

    fetch("/api/shop-config")
      .then((r) => r.json())
      .then((d: LeaveConfig & Record<string, unknown>) => {
        if (!isCurrentlyOnLeave(d)) return;
        setMessage(buildMessage(d));
        setDateRange({
          from: d.leave_start_date ?? undefined,
          until: d.leave_end_date ?? undefined,
        });
        setVisible(true);
      })
      .catch(() => {/* fail silently — never block UX */});
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: "0",
        padding: "14px 16px",
        background: "#FFF9F0",
        borderBottom: "2px solid #FDE68A",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        position: "relative",
        zIndex: 100,
      }}
    >
      {/* Calendar icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: "1px" }}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>

      <div style={{ flex: 1 }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "#92400E",
            fontFamily: "var(--font)",
            lineHeight: 1.4,
          }}
        >
          Shop Temporarily Closed
        </p>
        <p
          style={{
            fontSize: "0.8rem",
            color: "#B45309",
            fontFamily: "var(--font)",
            marginTop: "3px",
            lineHeight: 1.45,
          }}
        >
          {message}
        </p>
        {(dateRange.from || dateRange.until) && !message.includes(dateRange.from ?? "__NEVER__") && (
          <p
            style={{
              fontSize: "0.72rem",
              color: "#92400E",
              fontFamily: "var(--font)",
              marginTop: "4px",
              opacity: 0.8,
            }}
          >
            {dateRange.from && dateRange.until
              ? `${formatDate(dateRange.from)} – ${formatDate(dateRange.until)}`
              : dateRange.until
              ? `Until ${formatDate(dateRange.until)}`
              : ""}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss leave notice"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#B45309",
          padding: "4px",
          flexShrink: 0,
          fontSize: "1rem",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
