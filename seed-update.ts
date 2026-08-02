import "dotenv/config";
import { db } from "./lib/db";
import { vegetables } from "./drizzle/schema";
import { inArray, sql } from "drizzle-orm";

async function main() {
  console.log("Updating categories for banana and mango...");
  
  await db
    .update(vegetables)
    .set({ category: "fruit" })
    .where(inArray(vegetables.name_en, ["Banana", "Mango", "Banana (Robusta)", "Mango (Alphonso)"]));
    
  console.log("Replacing any .png image_url references with .jpg...");
  await db
    .update(vegetables)
    .set({
      image_url: sql`REPLACE(image_url, '.png', '.jpg')`
    });

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error updating seed:", err);
  process.exit(1);
});
