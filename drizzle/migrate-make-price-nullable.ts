/**
 * migrate-make-price-nullable.ts
 * Drops NOT NULL and DEFAULT '0' from vegetables.current_price,
 * and sets existing '0' values to NULL so unpriced items are distinct from ₹0.
 * Run with: npx tsx drizzle/migrate-make-price-nullable.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Drop DEFAULT and NOT NULL constraint on current_price
    await client.query(`
      ALTER TABLE vegetables ALTER COLUMN current_price DROP DEFAULT;
      ALTER TABLE vegetables ALTER COLUMN current_price DROP NOT NULL;
    `);
    console.log("✓ Made vegetables.current_price nullable with no default");

    // 2. Set existing '0' values to NULL (so unpriced items show 'Price will be updated soon')
    const res = await client.query(`
      UPDATE vegetables SET current_price = NULL WHERE current_price = '0';
    `);
    console.log(`✓ Converted ${res.rowCount} items with '0' price to NULL`);

    await client.query("COMMIT");
    console.log("\n✅ Migration complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
