import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, users, vegetables } from "@/drizzle/schema";
import { eq, inArray, ne } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get requested date from query param, or default to tomorrow IST
  const dateParam = req.nextUrl.searchParams.get("date");

  let targetDateStr = dateParam;
  if (!targetDateStr) {
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const tomorrow = new Date(nowIST);
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  }

  // Fetch all active orders for the date (excluding cancelled)
  const activeOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      user_name: users.name,
      user_phone: users.phone_number,
    })
    .from(orders)
    .leftJoin(users, eq(orders.user_id, users.id))
    .where(eq(orders.delivery_date, targetDateStr));

  const filteredOrders = activeOrders.filter((o) => o.status !== "cancelled");
  const orderIds = filteredOrders.map((o) => o.id);

  if (orderIds.length === 0) {
    return NextResponse.json({
      delivery_date: targetDateStr,
      total_orders: 0,
      purchase_list: [],
    });
  }

  // Fetch all order items for these active orders
  const allItems = await db
    .select({
      order_id: order_items.order_id,
      veg_id: order_items.veg_id,
      requested_qty: order_items.requested_qty,
      unit: order_items.unit,
      name_en: vegetables.name_en,
      name_ta: vegetables.name_ta,
      category: vegetables.category,
    })
    .from(order_items)
    .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
    .where(inArray(order_items.order_id, orderIds));

  // Map order_id to customer details
  const orderCustomerMap = new Map(
    filteredOrders.map((o) => [
      o.id,
      {
        name: o.user_name ?? "Customer",
        phone: o.user_phone ?? "",
        status: o.status,
      },
    ])
  );

  // Aggregate by vegetable/fruit ID
  interface CustomerBreakdown {
    order_id: string;
    customer_name: string;
    customer_phone: string;
    qty: number;
    unit: string;
  }

  interface AggregatedEntry {
    veg_id: string;
    name_en: string;
    name_ta: string;
    unit: string;
    category: string;
    total_qty: number;
    customers: CustomerBreakdown[];
  }

  const aggregatedMap = new Map<string, AggregatedEntry>();

  for (const item of allItems) {
    if (!item.veg_id || !item.order_id) continue;

    const customer = orderCustomerMap.get(item.order_id);
    const qty = Number(item.requested_qty) || 0;

    if (!aggregatedMap.has(item.veg_id)) {
      aggregatedMap.set(item.veg_id, {
        veg_id: item.veg_id,
        name_en: item.name_en ?? "Unknown Item",
        name_ta: item.name_ta ?? "",
        unit: item.unit,
        category: item.category ?? "vegetable",
        total_qty: 0,
        customers: [],
      });
    }

    const entry = aggregatedMap.get(item.veg_id)!;
    entry.total_qty += qty;

    if (customer) {
      entry.customers.push({
        order_id: item.order_id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        qty: qty,
        unit: item.unit,
      });
    }
  }

  const purchaseList = Array.from(aggregatedMap.values()).sort((a, b) =>
    a.name_en.localeCompare(b.name_en)
  );

  return NextResponse.json({
    delivery_date: targetDateStr,
    total_orders: filteredOrders.length,
    purchase_list: purchaseList,
  });
}
