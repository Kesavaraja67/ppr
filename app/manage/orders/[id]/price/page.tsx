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

// Builds plain text bill for WhatsApp / Web Share
function generateTextBill(order: Order, items: OrderItem[], shopName: string) {
  const priced = items.filter((i) => i.price_per_unit !== null);
  const rows = priced
    .map((i) => {
      const name = i.name_ta ? `${i.name_en} (${i.name_ta})` : (i.name_en ?? "Item");
      const qty = `${Number(i.requested_qty)} ${i.unit}`;
      const rate = `₹${Number(i.price_per_unit).toFixed(2)}`;
      const total = `₹${Number(i.line_total).toFixed(2)}`;
      return `• ${name}\n  ${qty} × ${rate} = ${total}`;
    })
    .join("\n");

  const subtotal = Number(order.subtotal ?? 0).toFixed(2);
  const delivery = Number(order.delivery_charge ?? 0) === 0 ? "Free" : `₹${Number(order.delivery_charge).toFixed(2)}`;
  const total = Number(order.total_amount ?? 0).toFixed(2);

  return `🧾 *${shopName} Bill*
📅 Delivery: ${order.delivery_date}
────────────────────────
${rows}
────────────────────────
Subtotal: ₹${subtotal}
Delivery: ${delivery}
*Total Amount: ₹${total}*

Payment: Cash on delivery
Thank you for ordering!`;
}

// Builds HTML bill for PDF attachment / printing
async function generatePDFData(order: Order, items: OrderItem[], shopName: string) {
  // Build HTML string and print to PDF via browser's print dialog
  const priced = items.filter((i) => i.price_per_unit !== null);
  const rows = priced
    .map(
      (i) =>
        `<tr>
          <td>${i.name_en} (${i.name_ta})</td>
          <td>${Number(i.requested_qty)} ${i.unit}</td>
          <td>₹${Number(i.price_per_unit).toFixed(2)}</td>
          <td>₹${Number(i.line_total).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bill - ${shopName}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; max-width: 480px; margin: 0 auto; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
  p.sub { text-align: center; color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; border-bottom: 1px solid #ccc; padding: 6px 4px; font-size: 12px; }
  td { padding: 6px 4px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  .total-row { font-weight: bold; }
  .delivery { color: #166534; }
  .grand { font-size: 15px; }
</style></head>
<body>
<h1>${shopName}</h1>
<p class="sub">Delivery Date: ${order.delivery_date}</p>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<br>
<table>
  <tr><td>Subtotal</td><td></td><td></td><td>₹${Number(order.subtotal).toFixed(2)}</td></tr>
  <tr class="delivery"><td>Delivery charge</td><td></td><td></td><td>${Number(order.delivery_charge) === 0 ? "Free" : "₹" + Number(order.delivery_charge).toFixed(2)}</td></tr>
  <tr class="total-row grand"><td colspan="3">Total</td><td>₹${Number(order.total_amount).toFixed(2)}</td></tr>
</table>
<br><p style="font-size:11px;color:#999;text-align:center">Payment: Cash on delivery · Thank you for ordering!</p>
</body></html>`;

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
