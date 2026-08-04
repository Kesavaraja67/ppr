/**
 * seed-bananas.ts
 * Idempotent seed script to insert/update the 8 distinct banana varieties into the `vegetables` table.
 * Run with: npx tsx seed-bananas.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { vegetables } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

interface BananaSeedItem {
  name_en: string;
  name_ta: string;
  unit: string;
  category: "fruit";
  allow_piece_mode: boolean;
}

const BANANA_ITEMS: BananaSeedItem[] = [
  { name_en: "Glucose Banana", name_ta: "குளுக்கோஸ் வாழை", unit: "dozen", category: "fruit", allow_piece_mode: true },
  { name_en: "Nendran Banana", name_ta: "நேந்திர வாழை", unit: "kg", category: "fruit", allow_piece_mode: true },
  { name_en: "Red Banana (Sevvaazhai)", name_ta: "செவ்வாழை", unit: "piece", category: "fruit", allow_piece_mode: true },
  { name_en: "Poovan Banana", name_ta: "பூவன் வாழை", unit: "dozen", category: "fruit", allow_piece_mode: true },
  { name_en: "Karpooravalli Banana", name_ta: "கற்பூரவல்லி வாழை", unit: "dozen", category: "fruit", allow_piece_mode: true },
  { name_en: "Virupakshi Banana", name_ta: "விருப்பாச்சி வாழை", unit: "dozen", category: "fruit", allow_piece_mode: true },
  { name_en: "Naattu Rasthali Banana", name_ta: "நாட்டு ரஸ்தாளி", unit: "dozen", category: "fruit", allow_piece_mode: true },
  { name_en: "Naadan Banana", name_ta: "நாடன் பழம்", unit: "dozen", category: "fruit", allow_piece_mode: true },
];

async function seedBananas() {
  console.log(`⏳ Seeding/Updating ${BANANA_ITEMS.length} banana varieties...`);
  let addedCount = 0;
  let updatedCount = 0;

  for (const item of BANANA_ITEMS) {
    const existing = await db
      .select({ id: vegetables.id })
      .from(vegetables)
      .where(eq(vegetables.name_en, item.name_en))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(vegetables)
        .set({
          name_ta: item.name_ta,
          unit: item.unit,
          category: item.category,
          allow_piece_mode: item.allow_piece_mode,
          in_stock: true,
          updated_at: new Date(),
        })
        .where(eq(vegetables.id, existing[0].id));
      console.log(`  ✓ Updated: ${item.name_en} (${item.name_ta})`);
      updatedCount++;
    } else {
      await db.insert(vegetables).values({
        name_en: item.name_en,
        name_ta: item.name_ta,
        unit: item.unit,
        category: item.category,
        allow_piece_mode: item.allow_piece_mode,
        in_stock: true,
      });
      console.log(`  + Added: ${item.name_en} (${item.name_ta})`);
      addedCount++;
    }
  }

  console.log(`\n🎉 Completed! Added: ${addedCount}, Updated: ${updatedCount}`);
}

seedBananas().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
