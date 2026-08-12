import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, vegetables, shop_config, users, addresses } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { computeDeliveryCharge } from "@/lib/delivery";

// POST /api/admin/orders/[id]/price — enter prices and compute totals
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;

  let body: { prices: Array<{ item_id: string; price_per_unit: number }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(body.prices)) {
    return NextResponse.json({ error: "prices must be an array" }, { status: 400 });
  }

  for (const p of body.prices) {
    if (!p.item_id || typeof p.price_per_unit !== "number" || !Number.isFinite(p.price_per_unit) || p.price_per_unit < 0) {
      return NextResponse.json({ error: "Invalid price values provided" }, { status: 400 });
    }
  }

  // Load order items with vegetable categories
  const items = await db
    .select({
      id: order_items.id,
      veg_id: order_items.veg_id,
      requested_qty: order_items.requested_qty,
      category: vegetables.category,
    })
    .from(order_items)
    .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
    .where(eq(order_items.order_id, orderId));

  if (items.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Build price map from request
  const priceMap = new Map(
    body.prices.map((p) => [p.item_id, p.price_per_unit])
  );

  // Load shop config for delivery thresholds
  const [config] = await db.select().from(shop_config).limit(1);
  if (!config) {
    return NextResponse.json({ error: "Shop config not found" }, { status: 500 });
  }

  const deliveryConfig = {
    free_delivery_veg_threshold: Number(config.free_delivery_veg_threshold),
    free_delivery_fruit_threshold: Number(config.free_delivery_fruit_threshold),
    free_delivery_mixed_threshold: Number(config.free_delivery_mixed_threshold),
    flat_delivery_charge: Number(config.flat_delivery_charge),
  };

  // Update each priced item and build lines for delivery calc
  const pricedLines: Array<{
    category: string;
    line_total: number;
  }> = [];

  try {
    for (const item of items) {
      const pricePerUnit = priceMap.get(item.id);
      if (pricePerUnit === undefined || pricePerUnit === null) {
        // Admin omitted this item (not available) — leave price null, no line total
        continue;
      }

      const qty = Number(item.requested_qty);
      const lineTotal = pricePerUnit * qty;

      await db
        .update(order_items)
        .set({
          price_per_unit: String(pricePerUnit),
          line_total: String(lineTotal),
        })
        .where(eq(order_items.id, item.id));

      pricedLines.push({
        category: item.category ?? "vegetable",
        line_total: lineTotal,
      });
    }

    const delivery = computeDeliveryCharge(pricedLines, deliveryConfig);

    await db
      .update(orders)
      .set({
        status: "priced",
        subtotal: String(delivery.subtotal),
        delivery_charge: String(delivery.delivery_charge),
        total_amount: String(delivery.total_amount),
        priced_at: new Date(),
      })
      .where(eq(orders.id, orderId));
  } catch (err) {
    console.error("[price-order] Error saving prices:", err);
    return NextResponse.json({ error: "Failed to save prices" }, { status: 500 });
  }

  // Reload for response
  const [updatedOrder] = await db
    .select({
      id: orders.id,
      status: orders.status,
      delivery_date: orders.delivery_date,
      subtotal: orders.subtotal,
      delivery_charge: orders.delivery_charge,
      total_amount: orders.total_amount,
      user_phone: users.phone_number,
      user_name: users.name,
      address_text: addresses.full_address,
    })
    .from(orders)
    .leftJoin(users, eq(orders.user_id, users.id))
    .leftJoin(addresses, eq(orders.address_id, addresses.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  const updatedItems = await db
    .select({
      id: order_items.id,
      veg_id: order_items.veg_id,
      requested_qty: order_items.requested_qty,
      unit: order_items.unit,
      price_per_unit: order_items.price_per_unit,
      line_total: order_items.line_total,
      name_en: vegetables.name_en,
      name_ta: vegetables.name_ta,
      category: vegetables.category,
      catalog_price: vegetables.current_price,
    })
    .from(order_items)
    .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
    .where(eq(order_items.order_id, orderId));

  return NextResponse.json({ order: updatedOrder, items: updatedItems });
}

// GET /api/admin/orders/[id]/price — fetch order with items for pricing screen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      delivery_date: orders.delivery_date,
      subtotal: orders.subtotal,
      delivery_charge: orders.delivery_charge,
      total_amount: orders.total_amount,
      user_phone: users.phone_number,
      user_name: users.name,
      address_text: addresses.full_address,
    })
    .from(orders)
    .leftJoin(users, eq(orders.user_id, users.id))
    .leftJoin(addresses, eq(orders.address_id, addresses.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = await db
    .select({
      id: order_items.id,
      veg_id: order_items.veg_id,
      requested_qty: order_items.requested_qty,
      unit: order_items.unit,
      price_per_unit: order_items.price_per_unit,
      line_total: order_items.line_total,
      name_en: vegetables.name_en,
      name_ta: vegetables.name_ta,
      category: vegetables.category,
      catalog_price: vegetables.current_price,
    })
    .from(order_items)
    .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
    .where(eq(order_items.order_id, orderId));

  return NextResponse.json({ order, items });
}
