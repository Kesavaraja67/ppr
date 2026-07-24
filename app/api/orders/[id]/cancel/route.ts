import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getCustomerSession } from "@/lib/customer-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.user_id, session.userId)))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending orders can be cancelled" },
      { status: 400 }
    );
  }

  const now = new Date();
  const cutoff = order.cancellable_until ? new Date(order.cancellable_until) : null;

  if (!cutoff || now > cutoff) {
    return NextResponse.json(
      {
        error:
          "Cancellation window has closed. Please call the shop to cancel.",
      },
      { status: 403 }
    );
  }

  await db
    .update(orders)
    .set({ status: "cancelled" })
    .where(eq(orders.id, id));

  return NextResponse.json({ success: true });
}
