/**
 * migrate-add-allow-piece-mode.ts
 * Adds allow_piece_mode column to vegetables table in production DB.
 * Run with: npx tsx drizzle/migrate-add-allow-piece-mode.ts
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

    // Add allow_piece_mode column if it doesn't already exist
    await client.query(`
      ALTER TABLE vegetables
      ADD COLUMN IF NOT EXISTS allow_piece_mode BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("✓ Added allow_piece_mode column to vegetables table");

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
