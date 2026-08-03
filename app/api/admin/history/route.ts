import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, users, addresses, vegetables } from "@/drizzle/schema";
import { eq, desc, inArray, count, sum, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const statusFilter = searchParams.get("status");

  // Validate limit/offset bounds for pagination
  const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 100);
  const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

  // 1. Stats query in SQL — total delivered count & revenue, plus total all orders count
  const [statsRes] = await db
    .select({
      total_delivered: count(sql`CASE WHEN ${orders.status} = 'delivered' THEN 1 END`),
      total_revenue: sum(sql`CASE WHEN ${orders.status} = 'delivered' THEN ${orders.total_amount} ELSE 0 END`),
      total_all_orders: count(orders.id),
    })
    .from(orders);

  // 2. Daily breakdown query — grouped by delivery_date in SQL
  const dailyBreakdownRaw = await db
    .select({
      date: orders.delivery_date,
      delivered_count: count(sql`CASE WHEN ${orders.status} = 'delivered' THEN 1 END`),
      total_revenue: sum(sql`CASE WHEN ${orders.status} = 'delivered' THEN ${orders.total_amount} ELSE 0 END`),
      total_orders: count(orders.id),
    })
    .from(orders)
    .groupBy(orders.delivery_date)
    .orderBy(desc(orders.delivery_date));

  const dailyBreakdown = dailyBreakdownRaw.map((d) => ({
    date: d.date,
    delivered_count: Number(d.delivered_count) || 0,
    total_revenue: Number(d.total_revenue) || 0,
    total_orders: Number(d.total_orders) || 0,
  }));

  // 3. Paginated orders query with status condition in SQL
  const whereClause =
    statusFilter && statusFilter !== "all"
      ? eq(orders.status, statusFilter)
      : undefined;

  const paginatedOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      delivery_date: orders.delivery_date,
      cancellable_until: orders.cancellable_until,
      created_at: orders.created_at,
      priced_at: orders.priced_at,
      subtotal: orders.subtotal,
      delivery_charge: orders.delivery_charge,
      total_amount: orders.total_amount,
      user_phone: users.phone_number,
      user_name: users.name,
      address_text: addresses.full_address,
      lat: addresses.lat,
      long: addresses.long,
    })
    .from(orders)
    .leftJoin(users, eq(orders.user_id, users.id))
    .leftJoin(addresses, eq(orders.address_id, addresses.id))
    .where(whereClause)
    .orderBy(desc(orders.delivery_date), desc(orders.created_at))
    .limit(limit)
    .offset(offset);

  const orderIds = paginatedOrders.map((o) => o.id);
  const allItems =
    orderIds.length > 0
      ? await db
          .select({
            id: order_items.id,
            order_id: order_items.order_id,
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
          .where(inArray(order_items.order_id, orderIds))
      : [];

  const itemsByOrderId = new Map<string, typeof allItems>();
  for (const item of allItems) {
    if (!item.order_id) continue;
    const list = itemsByOrderId.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrderId.set(item.order_id, list);
  }

  const ordersWithItems = paginatedOrders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
  }));

  return NextResponse.json({
    stats: {
      total_delivered: Number(statsRes?.total_delivered) || 0,
      total_revenue: Number(statsRes?.total_revenue) || 0,
      total_all_orders: Number(statsRes?.total_all_orders) || 0,
    },
    daily_breakdown: dailyBreakdown,
    orders: ordersWithItems,
  });
}
