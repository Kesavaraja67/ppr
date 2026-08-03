import React from "react";

export const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pending:          { label: "Pending",          bg: "#fef3c7", color: "#92400e" },
  priced:           { label: "Priced",            bg: "#dbeafe", color: "#1e40af" },
  out_for_delivery: { label: "Out for delivery", bg: "#fde68a", color: "#78350f" },
  delivered:        { label: "Delivered",        bg: "#d1fae5", color: "#065f46" },
  cancelled:        { label: "Cancelled",        bg: "#f3f4f6", color: "#6b7280" },
};

export default function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.72rem",
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: "9999px",
        background: meta.bg,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}
