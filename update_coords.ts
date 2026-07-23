import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { shop_config } from "./drizzle/schema";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  await db.update(shop_config).set({
    lat: "11.11985715",
    long: "76.94571665",
    covered_areas: ["Coimbatore", "Kavundampalayam", "Thudiyalur", "RS Puram", "Peelamedu"],
  });
  console.log("✅ Coordinates updated to Coimbatore");
  await client.end();
}
main().catch(console.error);
