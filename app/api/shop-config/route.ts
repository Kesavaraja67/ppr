import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shop_config } from "@/drizzle/schema";

// Public endpoint — only exposes fields needed for distance check and phone display
export async function GET() {
  const [config] = await db.select().from(shop_config).limit(1);
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    shop_name: config.shop_name,
    owner_name: config.owner_name,
    phone_number: config.phone_number,
    lat: config.lat,
    long: config.long,
    delivery_radius_km: config.delivery_radius_km,
    // Delivery charge thresholds — surfaced publicly so checkout can show
    // accurate free-delivery info without an extra authenticated API call.
    flat_delivery_charge: config.flat_delivery_charge,
    free_delivery_veg_threshold: config.free_delivery_veg_threshold,
    free_delivery_fruit_threshold: config.free_delivery_fruit_threshold,
    free_delivery_mixed_threshold: config.free_delivery_mixed_threshold,
    min_order_amount: config.min_order_amount ?? "500",
    covered_areas: config.covered_areas?.length
      ? config.covered_areas
      : [
          "Thudiyalur",
          "Vadamadurai (K. Vadamadurai)",
          "Sengalipalayam",
          "Thoppampatti Pirivu",
          "Maruthi Nagar",
        ],
    // Leave-mode banner fields (R7)
    is_on_leave: config.is_on_leave ?? false,
    leave_start_date: config.leave_start_date ?? null,
    leave_end_date: config.leave_end_date ?? null,
    leave_message: config.leave_message ?? null,
  });
}
