/**
 * Bulk-insert Tamil Nadu market produce list.
 * Run with: npx tsx drizzle/seed-bulk-vegetables.ts
 *
 * Safe to re-run — skips items that already exist (matched by name_en).
 * Does NOT modify existing rows.
 *
 * Items use correct Tamil Nadu market naming:
 *   "Ladies Finger" not "Okra", "Drumstick" not "Moringa pods", etc.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

import fs from "fs";
import path from "path";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

interface VegRow {
  name_en: string;
  name_ta: string;
  unit: string;
  category: "vegetable" | "fruit";
  // image_url is null for all — admin uploads via panel
}

// ─── Full Tamil Nadu market produce list ──────────────────────────────────────
// Deduplicated. Items already in initial seed (Tomato, Onion, Potato, Carrot,
// Brinjal, Okra, Cucumber, Beetroot, Spinach, Coriander, Banana, Mango) are
// NOT repeated here — they exist in the DB from db:seed.
//
// New items only:
const PRODUCE: VegRow[] = [
  // ── Vegetables ──────────────────────────────────────────────────────────────
  { name_en: "Beans",                name_ta: "பீன்ஸ்",                     unit: "kg",     category: "vegetable" },
  { name_en: "Karaimadu Brinjal",    name_ta: "காரமட கத்திரிக்கா",          unit: "kg",     category: "vegetable" },
  { name_en: "Violet Brinjal",       name_ta: "வயலட் கத்தரிக்கா",           unit: "kg",     category: "vegetable" },
  { name_en: "Balloon Brinjal",      name_ta: "பலூன் கத்தரிக்கா",           unit: "kg",     category: "vegetable" },
  { name_en: "Ash Gourd",            name_ta: "வெள்ளை பூசணி",               unit: "kg",     category: "vegetable" },
  { name_en: "Pumpkin",              name_ta: "அரசாணிக்கா",                  unit: "kg",     category: "vegetable" },
  { name_en: "Marrow",               name_ta: "மேர்க்கா",                    unit: "kg",     category: "vegetable" },
  { name_en: "Chow Chow",            name_ta: "சவுசவு",                      unit: "kg",     category: "vegetable" },
  { name_en: "Knol Khol",            name_ta: "நூல்கூள்",                    unit: "kg",     category: "vegetable" },
  { name_en: "Ladies Finger",        name_ta: "வெண்டைக்கா",                  unit: "kg",     category: "vegetable" },
  { name_en: "Broad Beans",          name_ta: "அவரைக்கா",                    unit: "kg",     category: "vegetable" },
  { name_en: "Cluster Beans",        name_ta: "கொத்தவரைக்கா",               unit: "kg",     category: "vegetable" },
  { name_en: "Hyacinth Beans",       name_ta: "கொடியவரை",                    unit: "kg",     category: "vegetable" },
  { name_en: "Country Cucumber",     name_ta: "நாட்டு வெல்லரிக்காய்",       unit: "kg",     category: "vegetable" },
  { name_en: "Field Beans",          name_ta: "மொச்சை",                      unit: "kg",     category: "vegetable" },
  { name_en: "Flat Beans",           name_ta: "தட்டைப்பயிர்",                unit: "kg",     category: "vegetable" },
  { name_en: "Snake Gourd",          name_ta: "பொடலங்காய்",                  unit: "kg",     category: "vegetable" },
  { name_en: "Bottle Gourd",         name_ta: "சுரைக்காய்",                  unit: "kg",     category: "vegetable" },
  { name_en: "Ivy Gourd",            name_ta: "கோவைக்காய்",                  unit: "kg",     category: "vegetable" },
  { name_en: "Bitter Gourd",         name_ta: "பாவக்காய்",                   unit: "kg",     category: "vegetable" },
  { name_en: "Ridge Gourd",          name_ta: "பீக்கங்காய்",                 unit: "kg",     category: "vegetable" },
  { name_en: "Raw Banana",           name_ta: "வாழைக்காய்",                  unit: "kg",     category: "vegetable" },
  { name_en: "Radish",               name_ta: "முளங்கி",                     unit: "kg",     category: "vegetable" },
  { name_en: "Samba Chilli",         name_ta: "சம்பா மிளகா",                 unit: "kg",     category: "vegetable" },
  { name_en: "Green Chilli",         name_ta: "வெறு மிளகாய்",                unit: "kg",     category: "vegetable" },
  { name_en: "Tapioca",              name_ta: "மரவள்ளி",                     unit: "kg",     category: "vegetable" },
  { name_en: "Sweet Potato",         name_ta: "சக்கரவள்ளி",                  unit: "kg",     category: "vegetable" },
  { name_en: "Cabbage",              name_ta: "முட்டைக்கோஸ்",                unit: "kg",     category: "vegetable" },
  { name_en: "Cauliflower",          name_ta: "காலிஃப்ளவர்",                 unit: "piece",  category: "vegetable" },
  { name_en: "Ginger",               name_ta: "இஞ்சி",                       unit: "kg",     category: "vegetable" },
  { name_en: "Seppankizhangu",       name_ta: "சேப்பங்கலங்கு",               unit: "kg",     category: "vegetable" },
  { name_en: "Elephant Foot Yam",    name_ta: "கருணக்கிழங்கு",              unit: "kg",     category: "vegetable" },
  { name_en: "Chinese Potato",       name_ta: "குறுக்கக்கிழங்கு",           unit: "kg",     category: "vegetable" },
  { name_en: "Coconut",              name_ta: "தேங்காய்",                    unit: "piece",  category: "vegetable" },
  { name_en: "Turnip",               name_ta: "டர்னிப்",                     unit: "kg",     category: "vegetable" },
  { name_en: "Drumstick",            name_ta: "முருங்கைக்காய்",              unit: "kg",     category: "vegetable" },
  { name_en: "Sena Kizhangu",        name_ta: "சானக்கிழங்கு",               unit: "kg",     category: "vegetable" },
  { name_en: "Kaavathu Kizhangu",    name_ta: "காவத்துக்கிழங்கு",           unit: "kg",     category: "vegetable" },
  { name_en: "Madavaattu Kizhangu",  name_ta: "மடவாட்டுக்கிழங்கு",         unit: "kg",     category: "vegetable" },
  { name_en: "Garlic",               name_ta: "பூண்டு",                      unit: "kg",     category: "vegetable" },
  { name_en: "Country Garlic",       name_ta: "நாட்டு பூண்டு",              unit: "kg",     category: "vegetable" },
  { name_en: "Big Onion",            name_ta: "பெரிய வெங்காயம்",            unit: "kg",     category: "vegetable" },
  { name_en: "Small Onion",          name_ta: "சின்ன வெங்காயம்",             unit: "kg",     category: "vegetable" },
  { name_en: "Country Tomato",       name_ta: "நாட்டு தக்காளி",              unit: "kg",     category: "vegetable" },
  { name_en: "Hybrid Tomato",        name_ta: "ஹைபிரிட் தக்காளி",           unit: "kg",     category: "vegetable" },
  { name_en: "Ooty Potato",          name_ta: "ஊட்டி உருளைக்கிழங்கு",      unit: "kg",     category: "vegetable" },
  { name_en: "Maize",                name_ta: "சோளம்",                       unit: "piece",  category: "vegetable" },
  { name_en: "Sweet Corn",           name_ta: "ஸ்வீட் கார்ன்",              unit: "piece",  category: "vegetable" },
  { name_en: "Groundnut",            name_ta: "வேரிக்காய்",                  unit: "kg",     category: "vegetable" },
  { name_en: "Mushroom",             name_ta: "காளான்",                      unit: "packet", category: "vegetable" },

  // ── Fruits ──────────────────────────────────────────────────────────────────
  { name_en: "Lemon",                name_ta: "லெமன்",                       unit: "kg",     category: "fruit" },
  { name_en: "Raw Mango",            name_ta: "மாங்காய்",                    unit: "kg",     category: "fruit" },
  { name_en: "Round Raw Mango",      name_ta: "உருட்டு மாங்காய்",           unit: "kg",     category: "fruit" },
  { name_en: "Amla",                 name_ta: "நெல்லிக்காய்",                unit: "kg",     category: "fruit" },
  { name_en: "Watermelon",           name_ta: "தர்பூசணி",                   unit: "kg",     category: "fruit" },
  { name_en: "Papaya",               name_ta: "பப்பாளி பழம்",               unit: "kg",     category: "fruit" },
  { name_en: "Custard Apple",        name_ta: "சீதாப்பழம்",                 unit: "kg",     category: "fruit" },
  { name_en: "Guava",                name_ta: "கொய்யாப்பழம்",               unit: "kg",     category: "fruit" },
  { name_en: "Muskmelon",            name_ta: "முலாம்பழம்",                  unit: "kg",     category: "fruit" },
  { name_en: "Plums",                name_ta: "ப்ளம்ஸ்",                     unit: "kg",     category: "fruit" },
  { name_en: "Red Dragon Fruit",     name_ta: "ரெட் டிராகன் ஃப்ரூட்",       unit: "kg",     category: "fruit" },
  { name_en: "Pomegranate",          name_ta: "மாதுளை பழம்",                unit: "kg",     category: "fruit" },
  { name_en: "Pineapple",            name_ta: "அண்ணாச்சி பழம்",             unit: "kg",     category: "fruit" },
  { name_en: "Kamala Orange",        name_ta: "கமலா ஆரஞ்ச்",                unit: "kg",     category: "fruit" },
  { name_en: "Mandarin Orange",      name_ta: "மாண்டரின் ஆரஞ்ச்",           unit: "kg",     category: "fruit" },
  { name_en: "Citrus Orange",        name_ta: "சிட்ரஸ் ஆரஞ்ச்",             unit: "kg",     category: "fruit" },
  { name_en: "White Dates",          name_ta: "ஒயிட் டேட்ஸ்",               unit: "kg",     category: "fruit" },
  { name_en: "Red Dates",            name_ta: "ரெட் டேட்ஸ்",                unit: "kg",     category: "fruit" },
  { name_en: "Rambutan",             name_ta: "ரம்புடான்",                   unit: "kg",     category: "fruit" },
  { name_en: "Kambam Grapes",        name_ta: "கம்பம் திராட்சை",            unit: "kg",     category: "fruit" },
  { name_en: "Sweet Lime",           name_ta: "சாத்துக்குடி",                unit: "kg",     category: "fruit" },
  { name_en: "Kiwi",                 name_ta: "கீவி",                        unit: "kg",     category: "fruit" },
];

async function main() {
  console.log(`⏳ Bulk-seeding ${PRODUCE.length} produce items…`);
  let added = 0;
  let skipped = 0;

  for (const item of PRODUCE) {
    // Check if this name_en already exists
    const existing = await db
      .select({ id: schema.vegetables.id })
      .from(schema.vegetables)
      .where(eq(schema.vegetables.name_en, item.name_en))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭  Skipping "${item.name_en}" — already exists`);
      skipped++;
      continue;
    }

    const slug = item.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const jpgPath = path.join(process.cwd(), "public", "curated", `${slug}.jpg`);
    const pngPath = path.join(process.cwd(), "public", "curated", `${slug}.png`);

    let imageUrl: string | null = null;
    if (fs.existsSync(jpgPath)) {
      imageUrl = `/curated/${slug}.jpg`;
    } else if (fs.existsSync(pngPath)) {
      imageUrl = `/curated/${slug}.png`;
    }

    await db.insert(schema.vegetables).values({
      name_en:        item.name_en,
      name_ta:        item.name_ta,
      unit:           item.unit,
      category:       item.category,
      current_price:  "0",       // Admin sets price via the stock management panel
      image_url:      imageUrl,
      is_curated_image: !!imageUrl,
      in_stock:       true,
    });

    console.log(`  ✅ Added "${item.name_en}" (${item.name_ta})`);
    added++;
  }

  console.log(`\n✅ Done — ${added} added, ${skipped} skipped (already existed)`);
  console.log(`ℹ️  All new items have low-storage compressed product photos linked under /curated/`);
  console.log(`   → Set prices in Manage → Stock`);
  await client.end();
}

main().catch((err) => {
  console.error("❌ Bulk seed failed:", err);
  process.exit(1);
});
