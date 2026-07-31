import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { shop_config } from "./drizzle/schema";

// ── Confirmed shop coordinates (Google Maps, 2026-07-31) ─────────────────────
// PPR Vegatable And Fruits, High School Road, NGGO Colony, Coimbatore 641022
const SHOP_LAT = "11.0915615";
const SHOP_LONG = "76.9452854";
const DELIVERY_RADIUS_KM = "5";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  const [existing] = await db.select({ id: shop_config.id }).from(shop_config).limit(1);
  if (!existing) {
    console.error("⚠️  No shop_config row found — run db:seed first.");
    await client.end();
    return;
  }

  await db.update(shop_config).set({
    lat: SHOP_LAT,
    long: SHOP_LONG,
    delivery_radius_km: DELIVERY_RADIUS_KM,
    covered_areas: [
      "Thudiyalur",
      "Vadamadurai (K. Vadamadurai)",
      "Sengalipalayam",
      "Thoppampatti Pirivu",
      "Maruthi Nagar",
    ],
  }).where(eq(shop_config.id, existing.id));

  const [row] = await db
    .select({ lat: shop_config.lat, long: shop_config.long, radius: shop_config.delivery_radius_km })
    .from(shop_config)
    .limit(1);

  console.log(`✅ Shop coords updated → lat: ${row.lat}, long: ${row.long}, radius: ${row.radius} km`);
  await client.end();
}

main().catch(console.error);
