/**
 * Database seed script.
 * Run with: npx tsx drizzle/seed.ts
 *
 * Creates:
 *  1. One admins row (Jayaraman P, phone 8870187248, PIN 1234 bcrypt-hashed)
 *  2. One shop_config row (placeholder lat/long — update after going live)
 *  3. A starter set of common vegetables with curated image refs
 *
 * ⚠️  CHANGE THE PIN IMMEDIATELY after first login.
 * ⚠️  Update lat/long in shop_config to the shop's real coordinates.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

const INITIAL_PIN = "1234"; // ← CHANGE THIS AFTER FIRST LOGIN

async function main() {
  console.log("⏳ Seeding database…");

  // ─── 1. Admin ───────────────────────────────────────────────────────────────
  const existingAdmin = await db
    .select({ id: schema.admins.id })
    .from(schema.admins)
    .where(eq(schema.admins.phone, "8870187248"))
    .limit(1);

  if (existingAdmin.length === 0) {
    const pin_hash = await bcrypt.hash(INITIAL_PIN, 12);
    await db.insert(schema.admins).values({
      name: "Jayaraman P",
      phone: "8870187248",
      pin_hash,
      role: "owner",
    });
    console.log("✅ Admin created — check seed script comments for the initial PIN. CHANGE IT NOW.");
  } else {
    console.log("ℹ️  Admin already exists — skipped");
  }

  // ─── 2. Shop config ─────────────────────────────────────────────────────────
  const existingConfig = await db
    .select({ id: schema.shop_config.id })
    .from(schema.shop_config)
    .limit(1);

  if (existingConfig.length === 0) {
    await db.insert(schema.shop_config).values({
      shop_name: "PPR Fruits & Vegetables",
      owner_name: "Jayaraman P",
      phone_number: "8870187248",
      // Actual shop coordinates (Coimbatore)
      lat: "11.119857",
      long: "76.945716",
      delivery_radius_km: "5",
      free_delivery_threshold: "300",
      covered_areas: ["Coimbatore", "Kavundampalayam", "Thudiyalur", "RS Puram", "Peelamedu"],
    });
    console.log("✅ Shop config created");
  } else {
    console.log("ℹ️  Shop config already exists — skipped");
  }

  // ─── 3. Starter vegetables ──────────────────────────────────────────────────
  const existingVegs = await db
    .select({ id: schema.vegetables.id })
    .from(schema.vegetables)
    .limit(1);

  if (existingVegs.length === 0) {
    const starterVegs: Array<typeof schema.vegetables.$inferInsert> = [
      { name_en: "Tomato", name_ta: "தக்காளி", unit: "kg", current_price: "40", image_url: "/curated/tomato.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Onion", name_ta: "வெங்காயம்", unit: "kg", current_price: "35", image_url: "/curated/onion.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Potato", name_ta: "உருளைக்கிழங்கு", unit: "kg", current_price: "30", image_url: "/curated/potato.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Carrot", name_ta: "கேரட்", unit: "kg", current_price: "50", image_url: "/curated/carrot.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Brinjal", name_ta: "கத்திரிக்காய்", unit: "kg", current_price: "45", image_url: "/curated/brinjal.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Okra", name_ta: "வெண்டைக்காய்", unit: "kg", current_price: "60", image_url: "/curated/okra.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Cucumber", name_ta: "வெள்ளரிக்காய்", unit: "kg", current_price: "25", image_url: "/curated/cucumber.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Beetroot", name_ta: "பீட்ரூட்", unit: "kg", current_price: "40", image_url: "/curated/beetroot.png", is_curated_image: true, category: "vegetable" },
      { name_en: "Spinach", name_ta: "பசலைக் கீரை", unit: "bunch", current_price: "15", image_url: "/curated/spinach.png", is_curated_image: true, category: "leafy" },
      { name_en: "Coriander", name_ta: "கொத்தமல்லி", unit: "bunch", current_price: "10", image_url: "/curated/coriander.png", is_curated_image: true, category: "leafy" },
      { name_en: "Banana", name_ta: "வாழைப்பழம்", unit: "dozen", current_price: "40", image_url: "/curated/banana.png", is_curated_image: true, category: "fruit" },
      { name_en: "Mango", name_ta: "மாம்பழம்", unit: "kg", current_price: "80", image_url: "/curated/mango.png", is_curated_image: true, category: "fruit" },
    ];

    for (const veg of starterVegs) {
      await db.insert(schema.vegetables).values({
        ...veg,
        current_price: String(veg.current_price),
        in_stock: true,
      });
    }
    console.log(`✅ ${starterVegs.length} starter vegetables seeded`);
  } else {
    console.log("ℹ️  Vegetables already exist — skipped");
  }

  console.log("✅ Seeding complete");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
