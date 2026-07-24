"use client";

export default function AdminLogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/manage";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        background: "none",
        border: "none",
        color: "#9ca3af",
        fontSize: "0.8rem",
        cursor: "pointer",
        padding: "8px 16px",
      }}
    >
      Sign out
    </button>
  );
}
