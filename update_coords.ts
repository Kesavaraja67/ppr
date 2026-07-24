import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { shop_config } from "./drizzle/schema";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  const [existing] = await db.select({ id: shop_config.id }).from(shop_config).limit(1);
  if (existing) {
    await db.update(shop_config).set({
      lat: "11.11985715",
      long: "76.94571665",
      covered_areas: ["Coimbatore", "Kavundampalayam", "Thudiyalur", "RS Puram", "Peelamedu"],
    }).where(eq(shop_config.id, existing.id));
    console.log("✅ Coordinates updated to Coimbatore");
  } else {
    console.log("⚠️ No shop_config row found");
  }
  await client.end();
}
main().catch(console.error);
