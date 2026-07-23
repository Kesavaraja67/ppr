import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const VALID_STATUSES = ["pending", "priced", "out_for_delivery", "delivered", "cancelled"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

// PATCH /api/admin/orders/[id]/status — update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const newStatus = body.status as OrderStatus;
  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Verify order exists
  const [order] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await db
    .update(orders)
    .set({ status: newStatus })
    .where(eq(orders.id, orderId));

  return NextResponse.json({ success: true, status: newStatus });
}
