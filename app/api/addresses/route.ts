import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses, shop_config } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getCustomerSession } from "@/lib/customer-auth";
import { haversineDistance } from "@/lib/haversine";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, session.userId));

  return NextResponse.json({ addresses: userAddresses });
}

export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { full_address?: string; lat?: number; long?: number };
  try {
    body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const fullAddress = body.full_address?.trim();
  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const long = typeof body.long === "number" ? body.long : Number(body.long);

  if (!fullAddress) {
    return NextResponse.json({ error: "Full address is required" }, { status: 400 });
  }

  if (isNaN(lat) || isNaN(long)) {
    return NextResponse.json(
      { error: "Valid latitude and longitude coordinates are required" },
      { status: 400 }
    );
  }

  // Fetch shop configuration from DB
  const [shopConf] = await db.select().from(shop_config).limit(1);
  const shopLat = shopConf ? Number(shopConf.lat) : 11.0168;
  const shopLong = shopConf ? Number(shopConf.long) : 76.9558;
  const radiusKm = shopConf ? Number(shopConf.delivery_radius_km) : 3;

  // Compute real distance using Haversine formula server-side
  const distanceKm = haversineDistance(lat, long, shopLat, shopLong);
  const isWithinRange = distanceKm <= radiusKm;

  if (!isWithinRange) {
    return NextResponse.json(
      {
        error: `Sorry, your location is outside our ${radiusKm}km delivery zone (${distanceKm.toFixed(1)}km away). Please call the shop at 94437 21544.`,
        distance_km: distanceKm,
        radius_km: radiusKm,
      },
      { status: 422 }
    );
  }

  // Save address with server-calculated is_within_range
  const [savedAddress] = await db
    .insert(addresses)
    .values({
      user_id: session.userId,
      full_address: fullAddress,
      lat: lat,
      long: long,
      is_within_range: isWithinRange,
    })
    .returning();

  return NextResponse.json({ address: savedAddress }, { status: 201 });
}
