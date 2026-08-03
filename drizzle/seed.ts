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

const INITIAL_PIN = "1987"; // ← CHANGE THIS AFTER FIRST LOGIN

async function main() {
  console.log("⏳ Seeding database…");

  // ─── 1. Admins ───────────────────────────────────────────────────────────────
  const adminCredentials = [
    { phone: "8870187248", pin: "1987", name: "Jayaraman P", role: "owner" },
    { phone: "8825952966", pin: "1996", name: "Admin 2", role: "owner" },
  ];

  for (const cred of adminCredentials) {
    const pin_hash = await bcrypt.hash(cred.pin, 12);
    const existing = await db
      .select({ id: schema.admins.id })
      .from(schema.admins)
      .where(eq(schema.admins.phone, cred.phone))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.admins).values({
        name: cred.name,
        phone: cred.phone,
        pin_hash,
        role: cred.role,
      });
      console.log(`✅ Admin ${cred.phone} created.`);
    } else {
      await db
        .update(schema.admins)
        .set({ pin_hash, name: cred.name, role: cred.role })
        .where(eq(schema.admins.phone, cred.phone));
      console.log(`✅ Admin ${cred.phone} PIN updated.`);
    }
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
      // Actual shop coordinates — PPR Vegatable And Fruits, High School Road,
      // NGGO Colony, Coimbatore (confirmed via Google Maps on 2026-07-31)
      lat: "11.0915615",
      long: "76.9452854",
      delivery_radius_km: "3",
      free_delivery_threshold: "300",
      covered_areas: [
        "Thudiyalur",
        "Vadamadurai (K. Vadamadurai)",
        "Sengalipalayam",
        "Thoppampatti Pirivu",
        "Maruthi Nagar",
      ],
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
      { name_en: "Country Tomato", name_ta: "நாட்டு தக்காளி", unit: "kg", current_price: "40", image_url: "/curated/country_tomato.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Big Onion", name_ta: "பெரிய வெங்காயம்", unit: "kg", current_price: "35", image_url: "/curated/big_onion.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Potato", name_ta: "உருளைக்கிழங்கு", unit: "kg", current_price: "30", image_url: "/curated/potato.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Carrot", name_ta: "கேரட்", unit: "kg", current_price: "50", image_url: "/curated/carrot.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Brinjal", name_ta: "கத்திரிக்காய்", unit: "kg", current_price: "45", image_url: "/curated/brinjal.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Ladies Finger", name_ta: "வெண்டைக்காய்", unit: "kg", current_price: "60", image_url: "/curated/ladies_finger.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Country Cucumber", name_ta: "நாட்டு வெள்ளரிக்காய்", unit: "kg", current_price: "25", image_url: "/curated/country_cucumber.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Beetroot", name_ta: "பீட்ரூட்", unit: "kg", current_price: "40", image_url: "/curated/beetroot.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Spinach", name_ta: "பசலைக் கீரை", unit: "bunch", current_price: "15", image_url: "/curated/spinach.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Coriander", name_ta: "கொத்தமல்லி", unit: "bunch", current_price: "10", image_url: "/curated/coriander.jpg", is_curated_image: true, category: "vegetable" },
      { name_en: "Banana", name_ta: "வாழைப்பழம்", unit: "dozen", current_price: "40", image_url: "/curated/banana.jpg", is_curated_image: true, category: "fruit" },
      { name_en: "Mango", name_ta: "மாம்பழம்", unit: "kg", current_price: "80", image_url: "/curated/mango.jpg", is_curated_image: true, category: "fruit" },
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
    console.log("ℹ️  Vegetables already exist — running idempotent name and metadata backfill");

    const renames = [
      { oldName: "Tomato", newName: "Country Tomato", name_ta: "நாட்டு தக்காளி", image_url: "/curated/country_tomato.jpg" },
      { oldName: "Onion", newName: "Big Onion", name_ta: "பெரிய வெங்காயம்", image_url: "/curated/big_onion.jpg" },
      { oldName: "Cucumber", newName: "Country Cucumber", name_ta: "நாட்டு வெள்ளரிக்காய்", image_url: "/curated/country_cucumber.jpg" },
    ];

    for (const item of renames) {
      const [existingTarget] = await db
        .select()
        .from(schema.vegetables)
        .where(eq(schema.vegetables.name_en, item.newName))
        .limit(1);

      const [existingOld] = await db
        .select()
        .from(schema.vegetables)
        .where(eq(schema.vegetables.name_en, item.oldName))
        .limit(1);

      if (existingOld) {
        if (existingTarget) {
          await db
            .update(schema.vegetables)
            .set({ image_url: item.image_url, is_curated_image: true })
            .where(eq(schema.vegetables.id, existingTarget.id));
          await db
            .delete(schema.vegetables)
            .where(eq(schema.vegetables.id, existingOld.id));
        } else {
          await db
            .update(schema.vegetables)
            .set({
              name_en: item.newName,
              name_ta: item.name_ta,
              image_url: item.image_url,
              is_curated_image: true,
            })
            .where(eq(schema.vegetables.id, existingOld.id));
        }
      } else if (existingTarget) {
        await db
          .update(schema.vegetables)
          .set({ image_url: item.image_url, is_curated_image: true })
          .where(eq(schema.vegetables.id, existingTarget.id));
      }
    }
  }

  console.log("✅ Seeding complete");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
