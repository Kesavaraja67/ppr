/**
 * update-delivery-charge.ts
 * One-off script to update existing production shop_config row flat_delivery_charge to "20".
 * Verifies there is exactly 1 row before executing.
 * Run with: npx tsx drizzle/update-delivery-charge.ts
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

    // 1. Verify single row existence
    const countRes = await client.query(`SELECT COUNT(*) FROM shop_config;`);
    const count = Number(countRes.rows[0].count);

    if (count !== 1) {
      throw new Error(`Expected exactly 1 shop_config row, but found ${count}. Aborting.`);
    }

    // 2. Update flat_delivery_charge to "20"
    await client.query(`
      UPDATE shop_config SET flat_delivery_charge = '20';
    `);
    console.log("✓ Updated flat_delivery_charge to ₹20");

    await client.query("COMMIT");
    console.log("\n✅ Update complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Update failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
