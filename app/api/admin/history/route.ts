import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, users, addresses, vegetables } from "@/drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Filter by status if provided (e.g. ?status=delivered or ?status=all)
  const statusFilter = req.nextUrl.searchParams.get("status");

  const allOrders = await db
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
    .orderBy(desc(orders.delivery_date), desc(orders.created_at));

  const filteredOrders = statusFilter && statusFilter !== "all"
    ? allOrders.filter((o) => o.status === statusFilter)
    : allOrders;

  const orderIds = filteredOrders.map((o) => o.id);
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

  const ordersWithItems = filteredOrders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
  }));

  // Statistics calculation
  const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
  const totalDeliveredCount = deliveredOrders.length;
  const totalDeliveredRevenue = deliveredOrders.reduce(
    (acc, o) => acc + (Number(o.total_amount) || 0),
    0
  );

  // Group delivered orders by date for the daily breakdown
  const dailyBreakdownMap = new Map<
    string,
    { date: string; delivered_count: number; total_revenue: number; total_orders: number }
  >();

  for (const order of allOrders) {
    const d = order.delivery_date;
    if (!dailyBreakdownMap.has(d)) {
      dailyBreakdownMap.set(d, {
        date: d,
        delivered_count: 0,
        total_revenue: 0,
        total_orders: 0,
      });
    }
    const entry = dailyBreakdownMap.get(d)!;
    entry.total_orders += 1;
    if (order.status === "delivered") {
      entry.delivered_count += 1;
      entry.total_revenue += Number(order.total_amount) || 0;
    }
  }

  const dailyBreakdown = Array.from(dailyBreakdownMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  return NextResponse.json({
    stats: {
      total_delivered: totalDeliveredCount,
      total_revenue: totalDeliveredRevenue,
      total_all_orders: allOrders.length,
    },
    daily_breakdown: dailyBreakdown,
    orders: ordersWithItems,
  });
}
