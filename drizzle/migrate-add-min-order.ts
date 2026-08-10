/**
 * migrate-add-min-order.ts
 * Adds min_order_amount column to shop_config table with default '500'.
 * Run with: npx tsx drizzle/migrate-add-min-order.ts
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

    await client.query(`
      ALTER TABLE shop_config
      ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC NOT NULL DEFAULT '500';
    `);
    console.log("✓ Added min_order_amount column to shop_config with default '500'");

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
