import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_items, users, addresses, vegetables } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

// GET /api/admin/orders — list tomorrow's orders for the admin dashboard
// ?status=all  → returns all statuses (pending, priced, out_for_delivery, delivered, cancelled)
// default      → returns only 'pending' orders (for shopping list)
export async function GET(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const showAll = req.nextUrl.searchParams.get("status") === "all";

  // Tomorrow's date in IST
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const tomorrow = new Date(nowIST);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const whereClause = showAll
    ? eq(orders.delivery_date, tomorrowStr)
    : and(eq(orders.delivery_date, tomorrowStr), eq(orders.status, "pending"));

  const pendingOrders = await db
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
    })
    .from(orders)
    .leftJoin(users, eq(orders.user_id, users.id))
    .leftJoin(addresses, eq(orders.address_id, addresses.id))
    .where(whereClause);

  // For each order, fetch its items with vegetable details
  const ordersWithItems = await Promise.all(
    pendingOrders.map(async (order) => {
      const items = await db
        .select({
          id: order_items.id,
          veg_id: order_items.veg_id,
          requested_qty: order_items.requested_qty,
          unit: order_items.unit,
          name_en: vegetables.name_en,
          name_ta: vegetables.name_ta,
          category: vegetables.category,
        })
        .from(order_items)
        .leftJoin(vegetables, eq(order_items.veg_id, vegetables.id))
        .where(eq(order_items.order_id, order.id));

      return { ...order, items };
    })
  );

  // Aggregated shopping list — sum quantities per vegetable across pending orders
  const aggregated: Record<
    string,
    { name_en: string; name_ta: string; unit: string; category: string; total_qty: number }
  > = {};

  // Always aggregate from pending only (shopping list is for what to buy)
  const pendingOnly = ordersWithItems.filter((o) => o.status === "pending");
  for (const order of pendingOnly) {
    for (const item of order.items) {
      if (!item.veg_id) continue;
      const key = item.veg_id;
      if (!aggregated[key]) {
        aggregated[key] = {
          name_en: item.name_en ?? "",
          name_ta: item.name_ta ?? "",
          unit: item.unit,
          category: item.category ?? "vegetable",
          total_qty: 0,
        };
      }
      aggregated[key].total_qty += Number(item.requested_qty);
    }
  }

  return NextResponse.json({
    orders: ordersWithItems,
    shopping_list: Object.values(aggregated).sort((a, b) =>
      a.name_en.localeCompare(b.name_en)
    ),
  });
}

