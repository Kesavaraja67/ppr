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
    covered_areas: config.covered_areas ?? [],
  });
}
