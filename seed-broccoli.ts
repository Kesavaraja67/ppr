/**
 * seed-broccoli.ts
 * Idempotent seed script to insert/update Broccoli in the `vegetables` table.
 * Run with: npx tsx seed-broccoli.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { vegetables } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seedBroccoli() {
  console.log("⏳ Seeding/Updating Broccoli...");

  const existing = await db
    .select({ id: vegetables.id })
    .from(vegetables)
    .where(eq(vegetables.name_en, "Broccoli"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(vegetables)
      .set({
        name_ta: "ப்ரோக்கோலி",
        unit: "kg",
        category: "vegetable",
        allow_piece_mode: true,
        in_stock: true,
        updated_at: new Date(),
      })
      .where(eq(vegetables.id, existing[0].id));
    console.log("  ✓ Updated: Broccoli (ப்ரோக்கோலி)");
  } else {
    await db.insert(vegetables).values({
      name_en: "Broccoli",
      name_ta: "ப்ரோக்கோலி",
      unit: "kg",
      category: "vegetable",
      allow_piece_mode: true,
      in_stock: true,
    });
    console.log("  + Added: Broccoli (ப்ரோக்கோலி)");
  }

  console.log("\n🎉 Completed!");
}

seedBroccoli().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
