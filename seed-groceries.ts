/**
 * seed-groceries.ts
 * Idempotent seed script to insert the 11 grocery items into the `vegetables` table.
 * Run manually after review with: npx tsx seed-groceries.ts
 */

import "dotenv/config";
import { db } from "./lib/db";
import { vegetables } from "./drizzle/schema";
import { eq } from "drizzle-orm";

interface GrocerySeedItem {
  name_en: string;
  name_ta: string;
  unit: string;
}

const GROCERY_ITEMS: GrocerySeedItem[] = [
  { name_en: "Aavin Milk (250ml)", name_ta: "ஆவின் பால் (250 மி.லி)", unit: "piece" },
  { name_en: "Aavin Milk (500ml)", name_ta: "ஆவின் பால் (500 மி.லி)", unit: "piece" },
  { name_en: "Hatsun Curd (500ml)", name_ta: "ஹட்சன் தயிர் (500 மி.லி)", unit: "piece" },
  { name_en: "SMP Curd (500ml)", name_ta: "எஸ்.எம்.பி தயிர் (500 மி.லி)", unit: "piece" },
  { name_en: "SMP Curd (250ml)", name_ta: "எஸ்.எம்.பி தயிர் (250 மி.லி)", unit: "piece" },
  { name_en: "SMP Curd (small box)", name_ta: "எஸ்.எம்.பி தயிர் (சிறிய பாக்கெட்)", unit: "piece" },
  { name_en: "SMP Buttermilk (200ml)", name_ta: "எஸ்.எம்.பி மோர் (200 மி.லி)", unit: "piece" },
  { name_en: "Egg", name_ta: "முட்டை", unit: "piece" },
  { name_en: "Raja Rani Dosai Maavu", name_ta: "ராஜா ராணி தோசை மாவு", unit: "piece" },
  { name_en: "Paneer", name_ta: "பன்னீர்", unit: "kg" },
  { name_en: "HomeDale Tea Powder", name_ta: "ஹோம்டேல் தேயிலைத் தூள்", unit: "piece" },
];

async function seedGroceries() {
  console.log(`⏳ Seeding ${GROCERY_ITEMS.length} grocery items...`);
  let addedCount = 0;
  let skippedCount = 0;

  for (const item of GROCERY_ITEMS) {
    // Check if item already exists by English name
    const [existing] = await db
      .select({ id: vegetables.id })
      .from(vegetables)
      .where(eq(vegetables.name_en, item.name_en))
      .limit(1);

    if (existing) {
      console.log(`  ℹ️ Skipping "${item.name_en}" — already exists`);
      skippedCount++;
    } else {
      await db.insert(vegetables).values({
        name_en: item.name_en,
        name_ta: item.name_ta,
        unit: item.unit,
        category: "grocery",
        current_price: "0",
        in_stock: true,
        image_url: null,
        allow_piece_mode: false,
      });
      console.log(`  ➕ Seeded grocery item "${item.name_en}" (${item.unit})`);
      addedCount++;
    }
  }

  console.log(`\n✅ Done! ${addedCount} added, ${skippedCount} skipped.`);
  process.exit(0);
}

seedGroceries().catch((err) => {
  console.error("❌ Grocery seed failed:", err);
  process.exit(1);
});
