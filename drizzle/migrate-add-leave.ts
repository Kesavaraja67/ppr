/**
 * migrate-add-leave.ts
 * Adds on-leave columns to shop_config table.
 * Run with: npx tsx drizzle/migrate-add-leave.ts
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
      ADD COLUMN IF NOT EXISTS is_on_leave BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS leave_start_date DATE,
      ADD COLUMN IF NOT EXISTS leave_end_date DATE,
      ADD COLUMN IF NOT EXISTS leave_message TEXT;
    `);
    console.log("✓ Added is_on_leave, leave_start_date, leave_end_date, leave_message to shop_config");

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
