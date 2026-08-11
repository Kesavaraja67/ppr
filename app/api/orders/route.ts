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

/** Helper to check if given lat/long coordinates are within shop delivery range */
async function isAddressWithinDeliveryRange(
  lat: number,
  long: number,
  fallbackWithinRange = false
): Promise<{ withinRange: boolean; radiusKm: number }> {
  const [shopConf] = await db.select().from(shop_config).limit(1);
  const radiusKm = shopConf ? Number(shopConf.delivery_radius_km) : 3;
  const withinRange = shopConf
    ? haversineDistance(lat, long, Number(shopConf.lat), Number(shopConf.long)) <= radiusKm
    : fallbackWithinRange;
  return { withinRange, radiusKm };
}

// ─── POST /api/orders — create a new order ────────────────────────────────────
export async function POST(req: NextRequest) {
  const correlationId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify session user exists in database
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!dbUser) {
      console.error("[orders] Session userId not found in database:", session.userId);
      return NextResponse.json(
        { error: "Session invalid or expired. Please verify your phone again." },
        { status: 401 }
      );
    }

    // Enforce ordering hours (bypassed for 24/7)
    if (!isWithinOrderWindow()) {
      console.error("[orders] Rejected: outside order window", { clientRequestId: correlationId });
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
      /** Client-generated UUID to prevent duplicate orders on network retry. */
      client_request_id?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      console.error("[orders] Rejected: empty items", { clientRequestId: body.client_request_id ?? null });
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
    }

    // Fetch shop config for minimum order threshold and leave state
    const [shopConf] = await db.select({
      min_order_amount: shop_config.min_order_amount,
      is_on_leave: shop_config.is_on_leave,
      leave_start_date: shop_config.leave_start_date,
      leave_end_date: shop_config.leave_end_date,
    }).from(shop_config).limit(1);
    const minOrderVal = shopConf ? Number(shopConf.min_order_amount) : 500;

    // Enforce leave mode: reject orders when the shop is on leave for today's date
    if (shopConf?.is_on_leave) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const y = parts.find((p) => p.type === "year")?.value ?? "";
      const m = parts.find((p) => p.type === "month")?.value ?? "";
      const d = parts.find((p) => p.type === "day")?.value ?? "";
      const today = `${y}-${m}-${d}`;

      const afterStart = !shopConf.leave_start_date || today >= shopConf.leave_start_date;
      const beforeEnd = !shopConf.leave_end_date || today <= shopConf.leave_end_date;
      if (afterStart && beforeEnd) {
        console.error("[orders] Rejected: shop on leave", { date: today, clientRequestId: correlationId });
        return NextResponse.json(
          { error: "The shop is temporarily closed and not accepting orders right now. Please try again when we reopen." },
          { status: 503 }
        );
      }
    }

    // Verify all vegetable IDs exist, are in stock, and check unit / mode permissions
    const vegIds = body.items.map((i) => i.veg_id);
    const foundVegs = await db
      .select({
        id: vegetables.id,
        unit: vegetables.unit,
        allow_piece_mode: vegetables.allow_piece_mode,
        current_price: vegetables.current_price,
        name_en: vegetables.name_en,
      })
      .from(vegetables)
      .where(and(inArray(vegetables.id, vegIds), eq(vegetables.in_stock, true)));

    const vegMap = new Map(foundVegs.map((v) => [v.id, v]));

    let pricedSubtotal = 0;
    let allItemsHavePrices = true;

    for (const item of body.items) {
      const dbVeg = vegMap.get(item.veg_id);
      if (!dbVeg) {
        return NextResponse.json(
          { error: `Item not found or out of stock: ${item.veg_id}` },
          { status: 400 }
        );
      }

      // Reject piece mode submissions if vegetable is base-kg and allow_piece_mode is false
      if (item.unit === "piece" && dbVeg.unit === "kg" && !dbVeg.allow_piece_mode) {
        return NextResponse.json(
          { error: `Ordering by piece is not allowed for ${dbVeg.name_en}` },
          { status: 400 }
        );
      }

      // Quantity validation: finite numeric value within [minQty, 1000]
      const minQty = item.unit === "kg" ? 0.1 : 1;
      const maxQty = 1000;
      if (
        typeof item.qty !== "number" ||
        !Number.isFinite(item.qty) ||
        item.qty < minQty ||
        item.qty > maxQty
      ) {
        return NextResponse.json(
          { error: `Invalid quantity for item ${item.veg_id}. Must be between ${minQty} and ${maxQty} ${item.unit}` },
          { status: 400 }
        );
      }

      if (
        dbVeg.current_price !== null &&
        dbVeg.current_price !== undefined &&
        dbVeg.current_price !== "" &&
        Number.isFinite(Number(dbVeg.current_price)) &&
        Number(dbVeg.current_price) >= 0
      ) {
        pricedSubtotal += Math.round(Number(dbVeg.current_price) * 100) * item.qty;
      } else {
        allItemsHavePrices = false;
      }
    }

    const pricedSubtotalAmount = pricedSubtotal / 100;

    // Hard-block server-side ONLY when all items are priced and estimated subtotal < minOrderVal
    if (allItemsHavePrices && pricedSubtotalAmount < minOrderVal) {
      console.error("[orders] Rejected: min order not met", {
        clientRequestId: body.client_request_id ?? null,
        subtotal: pricedSubtotalAmount,
        minRequired: minOrderVal,
      });
      return NextResponse.json(
        { error: `Minimum order value of ₹${minOrderVal} is required. Please add more items to your order.` },
        { status: 422 }
      );
    }

    // Resolve address ID
    let addressId: string;

    if (body.new_address) {
      // Recompute delivery-zone check server-side — never trust the client value
      const { withinRange, radiusKm } = await isAddressWithinDeliveryRange(
        body.new_address.lat,
        body.new_address.long,
        false
      );

      if (!withinRange) {
        console.error("[orders] Rejected: new address outside delivery zone", {
          clientRequestId: body.client_request_id ?? correlationId,
          radiusKm,
        });
        return NextResponse.json(
          { error: "Outside our delivery zone. Please call the shop to discuss options." },
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
      // Verify address belongs to this user
      const [addr] = await db
        .select()
        .from(addresses)
        .where(
          and(eq(addresses.id, body.address_id), eq(addresses.user_id, session.userId))
        )
        .limit(1);

      if (!addr) {
        console.error("[orders] Rejected: address not found or not owned by user", {
          clientRequestId: body.client_request_id ?? null,
        });
        return NextResponse.json({ error: "Address not found" }, { status: 404 });
      }

      // Re-verify delivery range server-side against current shop config.
      const { withinRange: withinRangeNow, radiusKm: savedRadiusKm } = await isAddressWithinDeliveryRange(
        Number(addr.lat),
        Number(addr.long),
        addr.is_within_range
      );

      if (!withinRangeNow) {
        console.error("[orders] Rejected: saved address now outside delivery zone", {
          clientRequestId: body.client_request_id ?? correlationId,
          addressId: body.address_id,
          radiusKm: savedRadiusKm,
        });
        // Self-heal stale flag so the UI reflects reality on next fetch
        if (addr.is_within_range) {
          await db
            .update(addresses)
            .set({ is_within_range: false })
            .where(eq(addresses.id, addr.id));
        }
        return NextResponse.json(
          { error: "This address is outside our current delivery zone." },
          { status: 422 }
        );
      }

      // Self-heal: flag was false but address is now in range (radius expanded)
      if (!addr.is_within_range) {
        await db
          .update(addresses)
          .set({ is_within_range: true })
          .where(eq(addresses.id, addr.id));
      }

      addressId = addr.id;

    } else {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Compute next-day delivery date and cancellable_until cutoff in IST timezone
    const istParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const y = Number(istParts.find((p) => p.type === "year")?.value);
    const m = Number(istParts.find((p) => p.type === "month")?.value);
    const d = Number(istParts.find((p) => p.type === "day")?.value);

    // Tomorrow IST
    const tomorrowUtc = new Date(Date.UTC(y, m - 1, d + 1));
    const delY = tomorrowUtc.getUTCFullYear();
    const delM = String(tomorrowUtc.getUTCMonth() + 1).padStart(2, "0");
    const delD = String(tomorrowUtc.getUTCDate()).padStart(2, "0");
    const deliveryDate = `${delY}-${delM}-${delD}`;

    // Cancellable until 8:00 PM today (IST) = 20:00:00+05:30
    const strM = String(m).padStart(2, "0");
    const strD = String(d).padStart(2, "0");
    const cancellableUntil = new Date(`${y}-${strM}-${strD}T20:00:00+05:30`);

    // Save customer name if provided (upsert on users.name)
    const trimmedName = body.name?.trim();
    if (trimmedName) {
      await db
        .update(users)
        .set({ name: trimmedName })
        .where(eq(users.id, session.userId));
    }

    // Idempotency check — return existing order if client_request_id was already used by this user
    if (body.client_request_id) {
      const [existingOrder] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.client_request_id, body.client_request_id),
            eq(orders.user_id, session.userId)
          )
        )
        .limit(1);
      if (existingOrder) {
        // Return 200 (not 201) to signal idempotent replay — order already exists
        return NextResponse.json({ orderId: existingOrder.id });
      }
    }

    // Create order + order_items (neon-http compatible sequential insert)
    const [order] = await db
      .insert(orders)
      .values({
        user_id: session.userId,
        address_id: addressId,
        delivery_date: deliveryDate,
        cancellable_until: cancellableUntil,
        client_request_id: body.client_request_id || null,
      })
      .returning({ id: orders.id });

    await db.insert(order_items).values(
      body.items.map((item) => ({
        order_id: order.id,
        veg_id: item.veg_id,
        requested_qty: String(item.qty),
        unit: item.unit || vegMap.get(item.veg_id)?.unit || "kg",
      }))
    );

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (err: unknown) {
    console.error("Order creation handler error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to create order. Please try again.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
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

  if (userOrders.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  // Batch-fetch all items for all orders in a single query (eliminates N+1)
  const orderIds = userOrders.map((o) => o.id);
  const allItems = await db
    .select({
      order_id: order_items.order_id,
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
    .where(inArray(order_items.order_id, orderIds));

  // Group items by order_id in memory
  const itemsByOrder = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const key = item.order_id ?? "";
    if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
    itemsByOrder.get(key)!.push(item);
  }

  const ordersWithItems = userOrders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));

  return NextResponse.json({ orders: ordersWithItems });
}
