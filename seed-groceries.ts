/**
 * seed-groceries.ts
 * Idempotent seed script to insert the 11 grocery items into the `vegetables` table.
 * Run manually after review with: npx tsx seed-groceries.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { vegetables } from "./drizzle/schema";
import { eq } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

interface GrocerySeedItem {
  name_en: string;
  name_ta: string;
  unit: string;
  image_url?: string;
}

const GROCERY_ITEMS: GrocerySeedItem[] = [
  { name_en: "Aavin Milk (250ml)", name_ta: "ஆவின் பால் (250 மி.லி)", unit: "piece", image_url: "/curated/aavin_milk_250ml.jpg" },
  { name_en: "Aavin Milk (500ml)", name_ta: "ஆவின் பால் (500 மி.லி)", unit: "piece", image_url: "/curated/aavin_milk_500ml.jpg" },
  { name_en: "Hatsun Curd (500g)", name_ta: "ஹட்சன் தயிர் (500 கி)", unit: "piece", image_url: "/curated/hatsun_curd_500g.jpg" },
  { name_en: "SMP Curd (450g)", name_ta: "எஸ்.எம்.பி தயிர் (450 கி)", unit: "piece", image_url: "/curated/smp_curd_450g.jpg" },
  { name_en: "SMP Curd (120g)", name_ta: "எஸ்.எம்.பி தயிர் (120 கி)", unit: "piece", image_url: "/curated/smp_curd_120g.jpg" },
  { name_en: "SMP Curd Cup", name_ta: "எஸ்.எம்.பி தயிர் (சிறிய பாக்கெட்)", unit: "piece", image_url: "/curated/smp_curd_cup.jpg" },
  { name_en: "SMP Buttermilk (200ml)", name_ta: "எஸ்.எம்.பி மோர் (200 மி.லி)", unit: "piece", image_url: "/curated/smp_buttermilk_200ml.jpg" },
  { name_en: "Egg", name_ta: "முட்டை", unit: "piece", image_url: "/curated/egg.jpg" },
  { name_en: "Raja Rani Dosai Maavu", name_ta: "ராஜா ராணி தோசை மாவு", unit: "piece", image_url: "/curated/raja_rani_maavu.jpg" },
  { name_en: "Paneer", name_ta: "பன்னீர்", unit: "kg", image_url: "/curated/hatsun_paneer.jpg" },
  { name_en: "HomeDale Tea Powder", name_ta: "ஹோம்டேல் தேயிலைத் தூள்", unit: "piece", image_url: "/curated/homedale_tea.jpg" },
];

// Mappings for old item names to new item names
const NAME_MAPPINGS: Record<string, string> = {
  "Hatsun Curd (500ml)": "Hatsun Curd (500g)",
  "SMP Curd (500ml)": "SMP Curd (450g)",
  "SMP Curd (250ml)": "SMP Curd (120g)",
  "SMP Curd (small box)": "SMP Curd Cup",
};

async function seedGroceries() {
  console.log(`⏳ Seeding/Updating ${GROCERY_ITEMS.length} grocery items...`);
  let addedCount = 0;
  let updatedCount = 0;

  // First handle renaming old item entries if found
  for (const [oldName, newName] of Object.entries(NAME_MAPPINGS)) {
    const targetItem = GROCERY_ITEMS.find((g) => g.name_en === newName);
    if (!targetItem) continue;

    const [oldEntry] = await db
      .select({ id: vegetables.id })
      .from(vegetables)
      .where(eq(vegetables.name_en, oldName))
      .limit(1);

    if (oldEntry) {
      await db
        .update(vegetables)
        .set({
          name_en: targetItem.name_en,
          name_ta: targetItem.name_ta,
          image_url: targetItem.image_url ?? null,
        })
        .where(eq(vegetables.id, oldEntry.id));
      console.log(`  🔄 Renamed "${oldName}" -> "${newName}"`);
      updatedCount++;
    }
  }

  for (const item of GROCERY_ITEMS) {
    const [existing] = await db
      .select({ id: vegetables.id, image_url: vegetables.image_url, name_en: vegetables.name_en })
      .from(vegetables)
      .where(eq(vegetables.name_en, item.name_en))
      .limit(1);

    if (existing) {
      if (item.image_url && existing.image_url !== item.image_url) {
        await db
          .update(vegetables)
          .set({ image_url: item.image_url })
          .where(eq(vegetables.id, existing.id));
        console.log(`  🔄 Updated image for "${item.name_en}" -> ${item.image_url}`);
        updatedCount++;
      }
    } else {
      await db.insert(vegetables).values({
        name_en: item.name_en,
        name_ta: item.name_ta,
        unit: item.unit,
        category: "grocery",
        current_price: "0",
        in_stock: true,
        image_url: item.image_url ?? null,
        allow_piece_mode: false,
      });
      console.log(`  ➕ Seeded grocery item "${item.name_en}" (${item.unit})`);
      addedCount++;
    }
  }

  console.log(`\n✅ Done! ${addedCount} added, ${updatedCount} updated.`);
  process.exit(0);
}

seedGroceries().catch((err) => {
  console.error("❌ Grocery seed failed:", err);
  process.exit(1);
});
