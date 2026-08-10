import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shop_config } from "@/drizzle/schema";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function GET() {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [config] = await db.select().from(shop_config).limit(1);
  if (!config) {
    return NextResponse.json({ error: "Shop config not found" }, { status: 404 });
  }

  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    shop_name?: string;
    owner_name?: string;
    phone_number?: string;
    lat?: number;
    long?: number;
    delivery_radius_km?: number;
    free_delivery_veg_threshold?: number;
    free_delivery_fruit_threshold?: number;
    free_delivery_mixed_threshold?: number;
    flat_delivery_charge?: number;
    min_order_amount?: number;
    covered_areas?: string[];
    // Leave-mode fields (R7)
    is_on_leave?: boolean;
    leave_start_date?: string | null;  // YYYY-MM-DD or null to clear
    leave_end_date?: string | null;    // YYYY-MM-DD or null to clear
    leave_message?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const [config] = await db.select().from(shop_config).limit(1);
  if (!config) {
    return NextResponse.json({ error: "Shop config not found" }, { status: 404 });
  }

  if (body.lat !== undefined && (typeof body.lat !== "number" || !Number.isFinite(body.lat) || body.lat < -90 || body.lat > 90)) {
    return NextResponse.json({ error: "Invalid lat coordinate" }, { status: 400 });
  }
  if (body.long !== undefined && (typeof body.long !== "number" || !Number.isFinite(body.long) || body.long < -180 || body.long > 180)) {
    return NextResponse.json({ error: "Invalid long coordinate" }, { status: 400 });
  }
  const numericFields: Array<[string, number | undefined]> = [
    ["delivery_radius_km", body.delivery_radius_km],
    ["free_delivery_veg_threshold", body.free_delivery_veg_threshold],
    ["free_delivery_fruit_threshold", body.free_delivery_fruit_threshold],
    ["free_delivery_mixed_threshold", body.free_delivery_mixed_threshold],
    ["flat_delivery_charge", body.flat_delivery_charge],
    ["min_order_amount", body.min_order_amount],
  ];

  for (const [name, val] of numericFields) {
    if (val !== undefined && (typeof val !== "number" || !Number.isFinite(val) || val < 0)) {
      return NextResponse.json({ error: `Invalid non-negative number for ${name}` }, { status: 400 });
    }
  }

  await db
    .update(shop_config)
    .set({
      ...(body.shop_name !== undefined && { shop_name: body.shop_name }),
      ...(body.owner_name !== undefined && { owner_name: body.owner_name }),
      ...(body.phone_number !== undefined && { phone_number: body.phone_number }),
      ...(body.lat !== undefined && { lat: String(body.lat) }),
      ...(body.long !== undefined && { long: String(body.long) }),
      ...(body.delivery_radius_km !== undefined && {
        delivery_radius_km: String(body.delivery_radius_km),
      }),
      ...(body.free_delivery_veg_threshold !== undefined && {
        free_delivery_veg_threshold: String(body.free_delivery_veg_threshold),
      }),
      ...(body.free_delivery_fruit_threshold !== undefined && {
        free_delivery_fruit_threshold: String(body.free_delivery_fruit_threshold),
      }),
      ...(body.free_delivery_mixed_threshold !== undefined && {
        free_delivery_mixed_threshold: String(body.free_delivery_mixed_threshold),
      }),
      ...(body.flat_delivery_charge !== undefined && {
        flat_delivery_charge: String(body.flat_delivery_charge),
      }),
      ...(body.min_order_amount !== undefined && {
        min_order_amount: String(body.min_order_amount),
      }),
      ...(body.covered_areas !== undefined && { covered_areas: body.covered_areas }),
      // Leave-mode (R7)
      ...(body.is_on_leave !== undefined && { is_on_leave: body.is_on_leave }),
      ...("leave_start_date" in body && { leave_start_date: body.leave_start_date ?? null }),
      ...("leave_end_date" in body && { leave_end_date: body.leave_end_date ?? null }),
      ...("leave_message" in body && { leave_message: body.leave_message ?? null }),
    })
    .where(eq(shop_config.id, config.id));

  const [updated] = await db.select().from(shop_config).limit(1);
  return NextResponse.json({ config: updated });
}

