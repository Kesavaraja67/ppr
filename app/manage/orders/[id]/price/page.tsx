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
  catalog_price?: string | null;
}

interface Order {
  id: string;
  status: string;
  delivery_date: string;
  subtotal: string | null;
  delivery_charge: string | null;
  total_amount: string | null;
  user_phone?: string | null;
  user_name?: string | null;
  address_text?: string | null;
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
Customer: ${order.user_name ?? 'N/A'}
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
Shop Contact: 63823 66080
Thank you for shopping!`;
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
        // Pre-fill price inputs with existing prices or catalog reference prices
        const initialPrices: Record<string, string> = {};
        for (const item of d.items ?? []) {
          const val = item.price_per_unit ?? item.catalog_price;
          if (val !== null && val !== undefined && val !== "") {
            initialPrices[item.id] = String(val);
          }
        }
        setPrices(initialPrices);
        // Show PDF actions immediately if the order is already finalized
        const finalizedStatuses = ["priced", "dispatched", "delivered", "completed"];
        if (finalizedStatuses.includes(d.order?.status)) setSaved(true);
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
    let groceryTotal = 0;
    let subtotal = 0;

    for (const item of items) {
      const p = Number(prices[item.id] ?? 0);
      const lineTotal = p * Number(item.requested_qty);
      if (lineTotal > 0) {
        subtotal += lineTotal;
        if (item.category === "vegetable") vegTotal += lineTotal;
        else if (item.category === "fruit") fruitTotal += lineTotal;
        else groceryTotal += lineTotal;
      }
    }
    if (subtotal === 0) return null;

    const hasVeg = vegTotal > 0;
    const hasFruit = fruitTotal > 0;
    const hasGrocery = groceryTotal > 0;
    let threshold: number;
    if (hasGrocery || (hasVeg && hasFruit)) threshold = config.mixed;
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

  const handleDownloadPdf = () => {
    if (!order) return;
    const pdfUrl = `/api/admin/orders/${order.id}/pdf?download=true`;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `P.P.R.-Bill-${order.delivery_date}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!order || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);

    try {
      const textBill = generateTextBill(order, items, shopName);
      const pdfRes = await fetch(`/api/admin/orders/${order.id}/pdf`);
      // Validate response before treating the body as a PDF
      const contentType = pdfRes.headers.get("content-type") ?? "";
      if (!pdfRes.ok || !contentType.includes("application/pdf")) {
        // Fall back to text-only share — still useful via WhatsApp
        console.warn("PDF unavailable, falling back to text share");
        const waText = encodeURIComponent(textBill);
        window.open(`https://api.whatsapp.com/send?text=${waText}`, "_blank");
        return;
      }
      const pdfBlob = await pdfRes.blob();
      const file = new File([pdfBlob], `P.P.R.-Bill-${order.delivery_date}.pdf`, {
        type: "application/pdf",
      });

      let shared = false;

      // 1. Try Web Share API (with PDF file if supported, else text)
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
            return;
          }
          if (shareErr?.name === "InvalidStateError") {
            return;
          }
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
      {/* Print styles: hides UI and shows dedicated receipt template on print */}
      <style>{`
        .printable-receipt {
          display: none;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; margin: 0; padding: 0; }
          .page-content { padding: 0 !important; max-width: 100% !important; }
          .printable-receipt {
            display: block !important;
            font-family: monospace, sans-serif;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
            color: #000;
            font-size: 13px;
            line-height: 1.4;
          }
          .receipt-divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .receipt-double-divider {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
        }
      `}</style>

      {/* Dedicated Printable Bill (Only visible during print) */}
      <div className="printable-receipt">
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
            {shopName}
          </h2>
          <p style={{ fontSize: "11px", margin: "2px 0" }}>Shop Contact: 63823 66080</p>
        </div>

        <div className="receipt-double-divider" />

        <div style={{ fontSize: "12px" }}>
          <div><strong>Order #:</strong> {order.id.slice(0, 8).toUpperCase()}</div>
          <div><strong>Date:</strong> {order.delivery_date}</div>
          <div><strong>Customer:</strong> {order.user_name || order.user_phone || "N/A"}</div>
          {order.user_phone && <div><strong>Phone:</strong> {order.user_phone}</div>}
        </div>

        <div className="receipt-divider" />

        {/* Item List Header */}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", paddingBottom: "4px", borderBottom: "1px solid #000" }}>
          <span>Item</span>
          <span style={{ textAlign: "right" }}>Total</span>
        </div>

        {/* Item Rows with Clear Segregation */}
        <div style={{ paddingTop: "6px" }}>
          {items.map((item, idx) => {
            const price = prices[item.id] ?? item.price_per_unit;
            if (!price) return null;
            const lineTotal = Number(price) * Number(item.requested_qty);
            const cleanTaName = item.name_ta ? item.name_ta.replace(/^\((.*)\)$/, "$1") : "";

            return (
              <div
                key={item.id}
                style={{
                  marginBottom: "6px",
                  paddingBottom: "6px",
                  borderBottom: idx === items.length - 1 ? "none" : "1px dashed #bbb",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                  {item.name_en} {cleanTaName ? `(${cleanTaName})` : ""}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#111", fontSize: "12px", marginTop: "2px" }}>
                  <span>
                    {Number(item.requested_qty)} {item.unit} x ₹{Number(price).toFixed(2)}
                  </span>
                  <span style={{ fontWeight: "bold" }}>₹{lineTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="receipt-divider" />

        {/* Totals */}
        {preview && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: "bold" }}>₹{preview.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "2px" }}>
              <span>Delivery Charge:</span>
              <span style={{ fontWeight: "bold" }}>{preview.deliveryCharge === 0 ? "FREE" : `₹${preview.deliveryCharge.toFixed(2)}`}</span>
            </div>

            <div className="receipt-double-divider" />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "bold" }}>
              <span>TOTAL AMOUNT:</span>
              <span>₹{preview.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="receipt-double-divider" />
      </div>

      {/* Main Web UI (Hidden during print) */}
      <div className="no-print">
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
                {preview.deliveryCharge === 0 ? "FREE" : `₹${preview.deliveryCharge.toFixed(2)}`}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleShare}
                className="btn-accent"
                style={{ flex: 1, justifyContent: "center" }}
                disabled={sharing}
              >
                {sharing ? "Sharing…" : "Share Bill (PDF)"}
              </button>
              <button
                onClick={handleDownloadPdf}
                style={{
                  flex: 1,
                  padding: "14px",
                  border: "1.5px solid #166534",
                  borderRadius: "9999px",
                  background: "#f0fdf4",
                  color: "#166534",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Download PDF
              </button>
            </div>
            <button
              onClick={handlePrint}
              style={{
                width: "100%",
                padding: "14px",
                border: "1.5px solid #166534",
                borderRadius: "9999px",
                background: "#166534",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
