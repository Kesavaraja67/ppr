import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, vegetables, shop_config, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import React from "react";
import path from "path";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register a Tamil-capable font so Tamil names render correctly in the PDF.
// Noto Sans Tamil (Tamil subset, weight 400, WOFF) supports all Tamil Unicode glyphs.
Font.register({
  family: "NotoSansTamil",
  src: path.join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff"
  ),
});

const styles = StyleSheet.create({
  page: {
    padding: 6,
    margin: 0,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "dashed",
    paddingBottom: 6,
    marginBottom: 6,
    alignItems: "center",
  },
  shopTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 2,
    color: "#000000",
  },
  shopSubtitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#000000",
  },
  metaText: {
    fontSize: 7.5,
    color: "#111827",
    marginTop: 1,
  },
  table: {
    width: "100%",
    marginTop: 4,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 3,
    marginBottom: 3,
  },
  thItem: { width: "44%", fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  thQty: { width: "16%", fontFamily: "Helvetica-Bold", fontSize: 7.5, textAlign: "right" },
  thRate: { width: "20%", fontFamily: "Helvetica-Bold", fontSize: 7.5, textAlign: "right" },
  thTotal: { width: "20%", fontFamily: "Helvetica-Bold", fontSize: 7.5, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    borderBottomStyle: "dashed",
    paddingVertical: 3,
  },
  tdItem: { width: "44%" },
  tdQty: { width: "16%", textAlign: "right", fontSize: 7.5 },
  tdRate: { width: "20%", textAlign: "right", fontSize: 7.5 },
  tdTotal: { width: "20%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  itemEng: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  itemTa: { fontSize: 7, color: "#4b5563", fontFamily: "NotoSansTamil" },
  totalsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderTopStyle: "dashed",
    marginTop: 4,
    paddingTop: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  totalLabel: { fontSize: 8 },
  totalVal: { fontSize: 8 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 4,
    marginTop: 3,
  },
  grandTotalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandTotalVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#000000" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderTopStyle: "dashed",
    marginTop: 8,
    paddingTop: 6,
    alignItems: "center",
  },
  footerBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  footerText: {
    fontSize: 7.5,
    color: "#000000",
    marginTop: 1,
  },
});

interface BillPDFProps {
  shopName: string;
  shopPhone: string;
  order: {
    id: string;
    delivery_date: string;
    subtotal: string | null;
    delivery_charge: string | null;
    total_amount: string | null;
    user_phone?: string | null;
    customer_name?: string | null;
  };
  items: Array<{
    id: string;
    requested_qty: string;
    unit: string;
    price_per_unit: string | null;
    line_total: string | null;
    name_en: string | null;
    name_ta: string | null;
  }>;
}

function BillPDFDocument({ shopName, shopPhone, order, items }: BillPDFProps) {
  const pricedItems = items.filter((i) => i.price_per_unit !== null);
  const subtotal = Number(order.subtotal ?? 0).toFixed(2);
  const isFreeDelivery = Number(order.delivery_charge ?? 0) === 0;
  const delivery = isFreeDelivery ? "FREE" : `Rs. ${Number(order.delivery_charge).toFixed(2)}`;
  const total = Number(order.total_amount ?? 0).toFixed(2);
  const shortOrderId = order.id.slice(0, 8).toUpperCase();

  return (
    <Document title={`P.P.R. Bill #${shortOrderId}`}>
      <Page size={[226.77, 800]} style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.shopTitle}>{shopName}</Text>
          <Text style={styles.shopSubtitle}>FRESH FRUITS &amp; VEGETABLES</Text>
          <Text style={styles.metaText}>Delivery Date: {order.delivery_date}</Text>
          <Text style={styles.metaText}>Order #: {shortOrderId}</Text>
          {order.customer_name ? (
            <Text style={styles.metaText}>Customer: {order.customer_name}</Text>
          ) : null}
          {order.user_phone ? (
            <Text style={styles.metaText}>Phone: {order.user_phone}</Text>
          ) : null}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thItem}>ITEM</Text>
            <Text style={styles.thQty}>QTY</Text>
            <Text style={styles.thRate}>RATE</Text>
            <Text style={styles.thTotal}>TOTAL</Text>
          </View>

          {pricedItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.tdItem}>
                <Text style={styles.itemEng}>{item.name_en ?? "Item"}</Text>
                {item.name_ta ? <Text style={styles.itemTa}>{item.name_ta}</Text> : null}
              </View>
              <Text style={styles.tdQty}>
                {Number(item.requested_qty)} {item.unit}
              </Text>
              <Text style={styles.tdRate}>
                Rs. {Number(item.price_per_unit).toFixed(2)}
              </Text>
              <Text style={styles.tdTotal}>
                Rs. {Number(item.line_total).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalVal}>Rs. {subtotal}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery Charge:</Text>
            <Text style={styles.totalVal}>{delivery}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL AMOUNT:</Text>
            <Text style={styles.grandTotalVal}>Rs. {total}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBold}>Payment: CASH ON DELIVERY</Text>
          <Text style={styles.footerText}>Call / WhatsApp: {shopPhone}</Text>
          <Text style={styles.footerText}>Thank you for shopping with us!</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const [order] = await db
      .select({
        id: orders.id,
        delivery_date: orders.delivery_date,
        status: orders.status,
        subtotal: orders.subtotal,
        delivery_charge: orders.delivery_charge,
        total_amount: orders.total_amount,
        user_phone: users.phone_number,
        customer_name: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Reject orders that have not been priced yet — PDF would show ₹0 totals.
    const finalizedStatuses = ["priced", "dispatched", "delivered", "completed"];
    if (!finalizedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: "Bill PDF is only available for priced orders" },
        { status: 400 }
      );
    }

    const items = await db
      .select({
        id: order_items.id,
        requested_qty: order_items.requested_qty,
        unit: order_items.unit,
        price_per_unit: order_items.price_per_unit,
        line_total: order_items.line_total,
        name_en: vegetables.name_en,
        name_ta: vegetables.name_ta,
      })
      .from(order_items)
      .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
      .where(eq(order_items.order_id, orderId));

    const [config] = await db.select().from(shop_config).limit(1);
    const shopName = config?.shop_name ?? "P.P.R. Fruits and Vegetables";
    const shopPhone = config?.phone_number ?? "63823 66080";

    const pdfBuffer = await renderToBuffer(
      <BillPDFDocument shopName={shopName} shopPhone={shopPhone} order={order} items={items} />
    );

    const isDownload = req.nextUrl.searchParams.get("download") === "true";
    const filename = `P.P.R.-Bill-${order.delivery_date}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
        // Private — bill contains customer name & phone; must not be stored in shared caches.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
