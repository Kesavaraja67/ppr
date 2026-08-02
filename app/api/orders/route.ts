import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, addresses, vegetables, users, shop_config } from "@/drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCustomerSession } from "@/lib/customer-auth";
import { haversineDistance } from "@/lib/haversine";

/** True when current IST time is within the 8 AM–8 PM ordering window. */
function isWithinOrderWindow(): boolean {
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const h = nowIST.getHours();
  return h >= 8 && h < 20;
}

// ─── POST /api/orders — create a new order ────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Enforce ordering hours: 8 AM–8 PM IST
  if (!isWithinOrderWindow()) {
    return NextResponse.json(
      { error: "Orders are only accepted between 8 AM and 8 PM. Please try again during shop hours." },
      { status: 403 }
    );
  }

  let body: {
    address_id?: string;
    new_address?: {
      full_address: string;
      lat: number;
      long: number;
    };
    items: Array<{ veg_id: string; qty: number; unit: string }>;
    name?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
  }

  // Validate each item — kg items may be 0.5 minimum, other units require >= 1
  for (const item of body.items) {
    const minQty = item.unit === "kg" ? 0.5 : 1;
    if (item.qty < minQty) {
      return NextResponse.json(
        { error: `Minimum quantity is ${minQty} ${item.unit} per item` },
        { status: 400 }
      );
    }
  }

  // Resolve address ID
  let addressId: string;

  if (body.new_address) {
    // Recompute delivery-zone check server-side — never trust the client value
    const [shopConf] = await db.select().from(shop_config).limit(1);
    const radiusKm = shopConf ? Number(shopConf.delivery_radius_km) : 3;
    const withinRange = shopConf
      ? haversineDistance(
          body.new_address.lat,
          body.new_address.long,
          Number(shopConf.lat),
          Number(shopConf.long)
        ) <= radiusKm
      : false;

    if (!withinRange) {
      return NextResponse.json(
        {
          error:
            "Outside our delivery zone. Please call the shop to discuss options.",
        },
        { status: 422 }
      );
    }

    const [savedAddress] = await db
      .insert(addresses)
      .values({
        user_id: session.userId,
        full_address: body.new_address.full_address,
        lat: body.new_address.lat,
        long: body.new_address.long,
        is_within_range: true,
      })
      .returning({ id: addresses.id });

    addressId = savedAddress.id;
  } else if (body.address_id) {
    // Verify address belongs to this user and is within range
    const [addr] = await db
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.id, body.address_id), eq(addresses.user_id, session.userId))
      )
      .limit(1);

    if (!addr) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    if (!addr.is_within_range) {
      return NextResponse.json(
        { error: "This address is outside our delivery zone" },
        { status: 422 }
      );
    }

    addressId = addr.id;
  } else {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  // Compute next-day delivery date (IST)
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const tomorrow = new Date(nowIST);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deliveryDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  // Cancellable until 10:00 PM today (IST) = 22:00 IST = 16:30 UTC
  const cancellableUntilIST = new Date(
    `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, "0")}-${String(nowIST.getDate()).padStart(2, "0")}T22:00:00+05:30`
  );
  // If it's already past 10 PM, order can't be cancelled (cutoff passed immediately)
  // We still allow order creation, just with cancellable_until in the past
  const cancellableUntil = cancellableUntilIST;

  // Verify all vegetable IDs exist
  const vegIds = body.items.map((i) => i.veg_id);
  const foundVegs = await db
    .select({ id: vegetables.id, unit: vegetables.unit })
    .from(vegetables)
    .where(inArray(vegetables.id, vegIds));

  const vegMap = new Map(foundVegs.map((v) => [v.id, v.unit]));

  for (const item of body.items) {
    if (!vegMap.has(item.veg_id)) {
      return NextResponse.json(
        { error: `Item not found: ${item.veg_id}` },
        { status: 400 }
      );
    }
  }

  // Save customer name if provided (upsert on users.name)
  const trimmedName = body.name?.trim();
  if (trimmedName) {
    await db
      .update(users)
      .set({ name: trimmedName })
      .where(eq(users.id, session.userId));
  }

  // Create order + order_items in a single transaction
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        user_id: session.userId,
        address_id: addressId,
        delivery_date: deliveryDate,
        cancellable_until: cancellableUntil,
      })
      .returning({ id: orders.id });

    await tx.insert(order_items).values(
      body.items.map((item) => ({
        order_id: order.id,
        veg_id: item.veg_id,
        requested_qty: String(item.qty),
        unit: item.unit || vegMap.get(item.veg_id) || "kg",
      }))
    );

    return order;
  });

  return NextResponse.json({ orderId: result.id }, { status: 201 });
}

// ─── GET /api/orders — list user's orders ────────────────────────────────────
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userOrders = await db
    .select({
      id: orders.id,
      delivery_date: orders.delivery_date,
      status: orders.status,
      subtotal: orders.subtotal,
      delivery_charge: orders.delivery_charge,
      total_amount: orders.total_amount,
      cancellable_until: orders.cancellable_until,
      created_at: orders.created_at,
    })
    .from(orders)
    .where(eq(orders.user_id, session.userId))
    .orderBy(desc(orders.created_at));

  // For each order, fetch its items with vegetable details
  const ordersWithItems = await Promise.all(
    userOrders.map(async (order) => {
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
        })
        .from(order_items)
        .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
        .where(eq(order_items.order_id, order.id));

      return { ...order, items };
    })
  );

  return NextResponse.json({ orders: ordersWithItems });
}
