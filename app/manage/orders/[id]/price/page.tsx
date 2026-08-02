"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  veg_id: string;
  requested_qty: string;
  unit: string;
  price_per_unit: string | null;
  line_total: string | null;
  name_en: string | null;
  name_ta: string | null;
  category: string | null;
}

interface Order {
  id: string;
  status: string;
  delivery_date: string;
  subtotal: string | null;
  delivery_charge: string | null;
  total_amount: string | null;
  user_phone?: string;
}

// Builds plain text bill for 80mm thermal print bridge (RawBT / Web Share)
function generateTextBill(order: Order, items: OrderItem[], shopName: string) {
  const priced = items.filter((i) => i.price_per_unit !== null);
  const rows = priced
    .map((i) => {
      const name = i.name_en ?? "Item";
      const qty = `${Number(i.requested_qty)} ${i.unit}`;
      const rate = `₹${Number(i.price_per_unit).toFixed(2)}`;
      const total = `₹${Number(i.line_total).toFixed(2)}`;
      return `${name}\n  ${qty} x ${rate} = ${total}`;
    })
    .join("\n--------------------------------\n");

  const subtotal = Number(order.subtotal ?? 0).toFixed(2);
  const delivery = Number(order.delivery_charge ?? 0) === 0 ? "FREE" : `₹${Number(order.delivery_charge).toFixed(2)}`;
  const total = Number(order.total_amount ?? 0).toFixed(2);

  return `${shopName.toUpperCase()}
================================
Delivery: ${order.delivery_date}
Order #: ${order.id.slice(0, 8).toUpperCase()}
Phone: ${order.user_phone ?? 'N/A'}
================================
${rows}
--------------------------------
Subtotal:        ₹${subtotal}
Delivery Charge: ${delivery}
================================
TOTAL AMOUNT:    ₹${total}
================================
Payment: Cash on Delivery
Shop Contact: 94437 21544
Thank you for shopping!`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Builds narrow 80mm thermal receipt HTML (203 dpi, ~576px / 72mm width printable area)
async function generatePDFData(order: Order, items: OrderItem[], shopName: string) {
  const priced = items.filter((i) => i.price_per_unit !== null);
  const rows = priced
    .map(
      (i) =>
        `<tr>
          <td style="padding:4px 2px;vertical-align:top;border-bottom:1px dotted #ccc;">
            <div style="font-weight:bold;">${escapeHtml(i.name_en ?? "")}</div>
            ${i.name_ta ? `<div style="font-size:10px;color:#333;">${escapeHtml(i.name_ta)}</div>` : ''}
          </td>
          <td style="padding:4px 2px;text-align:right;vertical-align:top;border-bottom:1px dotted #ccc;">${Number(i.requested_qty)} ${escapeHtml(i.unit)}</td>
          <td style="padding:4px 2px;text-align:right;vertical-align:top;border-bottom:1px dotted #ccc;">₹${Number(i.price_per_unit).toFixed(2)}</td>
          <td style="padding:4px 2px;text-align:right;vertical-align:top;border-bottom:1px dotted #ccc;font-weight:bold;">₹${Number(i.line_total).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const subtotal = Number(order.subtotal ?? 0).toFixed(2);
  const delivery = Number(order.delivery_charge ?? 0) === 0 ? "FREE" : `₹${Number(order.delivery_charge).toFixed(2)}`;
  const total = Number(order.total_amount ?? 0).toFixed(2);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${escapeHtml(order.id.slice(0, 8).toUpperCase())}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      width: 72mm;
      max-width: 576px;
      margin: 0 auto;
      padding: 10px 4px;
      color: #000000;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .header { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .header h1 { font-size: 16px; margin: 0 0 2px 0; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
    th { text-align: left; border-bottom: 1px solid #000; padding: 4px 2px; font-size: 10px; text-transform: uppercase; }
    .totals-table { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; }
    .totals-table td { border-bottom: none; padding: 3px 2px; }
    .footer { border-top: 1px dashed #000; margin-top: 10px; padding-top: 8px; font-size: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="header text-center">
    <h1>${escapeHtml(shopName)}</h1>
    <p class="bold">FRESH FRUITS &amp; VEGETABLES</p>
    <p>Delivery: ${escapeHtml(order.delivery_date)}</p>
    <p>Order #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>
    ${order.user_phone ? `<p>Customer: ${escapeHtml(order.user_phone)}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40%;">Item</th>
        <th style="width:20%;text-align:right;">Qty</th>
        <th style="width:20%;text-align:right;">Rate</th>
        <th style="width:20%;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td colspan="2" style="font-weight:bold;">Subtotal:</td>
      <td colspan="2" class="text-right bold">₹${subtotal}</td>
    </tr>
    <tr>
      <td colspan="2">Delivery Charge:</td>
      <td colspan="2" class="text-right">${delivery}</td>
    </tr>
    <tr style="font-size:13px;border-top:1px solid #000;">
      <td colspan="2" class="bold" style="padding-top:6px;">GRAND TOTAL:</td>
      <td colspan="2" class="text-right bold" style="padding-top:6px;">₹${total}</td>
    </tr>
  </table>

  <div class="footer">
    <p class="bold">Payment: CASH ON DELIVERY</p>
    <p>Call / WhatsApp: 94437 21544</p>
    <p style="margin-top:4px;">Thank you for shopping with us!</p>
  </div>
</body>
</html>`;

  return html;
}

export default function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Ref guard prevents a second share() call from firing before React state updates
  const sharingRef = useRef(false);
  const [shopName, setShopName] = useState("P.P.R. Fruits and Vegetables");
  const [config, setConfig] = useState<{ veg: number; fruit: number; mixed: number; charge: number } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${orderId}/price`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d.order);
        setItems(d.items ?? []);
        // Pre-fill existing prices if already priced
        const existing: Record<string, string> = {};
        for (const item of d.items ?? []) {
          if (item.price_per_unit) existing[item.id] = item.price_per_unit;
        }
        setPrices(existing);
      });

    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setShopName(d.config?.shop_name ?? "P.P.R. Fruits and Vegetables");
        setConfig({
          veg: Number(d.config?.free_delivery_veg_threshold ?? 500),
          fruit: Number(d.config?.free_delivery_fruit_threshold ?? 1000),
          mixed: Number(d.config?.free_delivery_mixed_threshold ?? 700),
          charge: Number(d.config?.flat_delivery_charge ?? 50),
        });
      });
  }, [orderId]);

  // Live delivery charge preview
  const getPreview = () => {
    if (!config) return null;
    let vegTotal = 0;
    let fruitTotal = 0;
    for (const item of items) {
      const p = Number(prices[item.id] ?? 0);
      const lineTotal = p * Number(item.requested_qty);
      if (item.category === "vegetable") vegTotal += lineTotal;
      else if (item.category === "fruit") fruitTotal += lineTotal;
    }
    const subtotal = vegTotal + fruitTotal;
    if (subtotal === 0) return null;

    const hasVeg = vegTotal > 0;
    const hasFruit = fruitTotal > 0;
    let threshold: number;
    if (hasVeg && hasFruit) threshold = config.mixed;
    else if (hasVeg) threshold = config.veg;
    else threshold = config.fruit;

    const deliveryCharge = subtotal >= threshold ? 0 : config.charge;
    return { subtotal, deliveryCharge, total: subtotal + deliveryCharge };
  };

  const preview = getPreview();

  const handleSave = async () => {
    setSaving(true);
    const priceList = Object.entries(prices).map(([item_id, price]) => ({
      item_id,
      price_per_unit: Number(price),
    }));

    const res = await fetch(`/api/admin/orders/${orderId}/price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices: priceList }),
    });
    setSaving(false);

    if (res.ok) {
      const d = await res.json();
      setOrder(d.order);
      // Refresh items so the bill PDF reflects the saved prices
      if (d.items) setItems(d.items);
      setSaved(true);
    } else {
      alert("Failed to save prices. Please try again.");
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    const html = await generatePDFData(order, items, shopName);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleShare = async () => {
    if (!order || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);

    try {
      const textBill = generateTextBill(order, items, shopName);
      const html = await generatePDFData(order, items, shopName);
      const blob = new Blob([html], { type: "text/html" });
      const file = new File([blob], `P.P.R.-Bill-${order.delivery_date}.html`, { type: "text/html" });

      let shared = false;

      // 1. Try Web Share API (with files if supported, else text)
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const canShareFile = navigator.canShare && navigator.canShare({ files: [file] });
          if (canShareFile) {
            await navigator.share({
              title: `Bill - ${shopName}`,
              text: textBill,
              files: [file],
            });
          } else {
            await navigator.share({
              title: `Bill - ${shopName}`,
              text: textBill,
            });
          }
          shared = true;
        } catch (err: unknown) {
          const shareErr = err as { name?: string };
          if (shareErr?.name === "AbortError" || shareErr?.name === "NotAllowedError") {
            // User cancelled the share dialog — return quietly, skip WhatsApp fallback
            return;
          }
          if (shareErr?.name === "InvalidStateError") {
            // A previous share is still open (shouldn't happen with the ref guard, but be safe)
            return;
          }
          // Other errors fall through to WhatsApp fallback
        }
      }

      // 2. Fallback: open WhatsApp share with formatted text bill
      if (!shared) {
        const waText = encodeURIComponent(textBill);
        window.open(`https://api.whatsapp.com/send?text=${waText}`, "_blank");
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  if (!order) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading…</div>;
  }

  return (
    <div className="page-content" style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>
          ←
        </button>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Enter Prices</h1>
          <p style={{ fontSize: "0.78rem", color: "#6b7280" }}>Delivery: {order.delivery_date}</p>
        </div>
      </div>

      <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "16px" }}>
        Enter today&apos;s market price for each item. Leave blank for items not available.
      </p>

      {/* Item pricing table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {items.map((item) => {
          const price = prices[item.id] ?? "";
          const lineTotal = price ? Number(price) * Number(item.requested_qty) : null;

          return (
            <div
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name_en}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                    {item.name_ta} · {Number(item.requested_qty)} {item.unit} ordered
                  </p>
                </div>
                {lineTotal !== null && (
                  <p style={{ fontWeight: 700, color: "#166534", fontSize: "0.9rem" }}>
                    ₹{lineTotal.toFixed(0)}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#6b7280", fontSize: "0.9rem", flexShrink: 0 }}>₹ / {item.unit}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Price (leave blank if unavailable)"
                  value={price}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="admin-input"
                  style={{ flex: 1 }}
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery charge preview */}
      {preview && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "16px",
            fontSize: "0.88rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 700 }}>₹{preview.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>Delivery charge</span>
            <span style={{ color: "#166534", fontWeight: 700 }}>
              {preview.deliveryCharge === 0 ? "Free 🎉" : `₹${preview.deliveryCharge.toFixed(2)}`}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem", borderTop: "1px solid #bbf7d0", paddingTop: "8px" }}>
            <span>Total</span>
            <span>₹{preview.total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {!saved ? (
        <button
          className="btn-accent"
          style={{ width: "100%", justifyContent: "center", marginBottom: "10px" }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save & Finalise Bill"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleShare}
            className="btn-accent"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={sharing}
          >
            {sharing ? "Sharing…" : "Share Bill"}
          </button>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: "14px",
              border: "1.5px solid #166534",
              borderRadius: "9999px",
              background: "#fff",
              color: "#166534",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Download / Print
          </button>
        </div>
      )}
    </div>
  );
}
