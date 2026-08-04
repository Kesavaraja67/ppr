/**
 * migrate-update-allow-piece-mode-default.ts
 * Updates all existing vegetable/fruit kg rows to allow_piece_mode = true
 * and sets default of allow_piece_mode column to true in production DB.
 * Run with: npx tsx drizzle/migrate-update-allow-piece-mode-default.ts
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

    // Update existing kg items in vegetable or fruit category to allow_piece_mode = true
    const res = await client.query(`
      UPDATE vegetables
      SET allow_piece_mode = true
      WHERE category IN ('vegetable', 'fruit') AND unit = 'kg';
    `);
    console.log(`✓ Updated ${res.rowCount} existing vegetable/fruit kg rows to allow_piece_mode = true`);

    // Set default of allow_piece_mode column to true
    await client.query(`
      ALTER TABLE vegetables
      ALTER COLUMN allow_piece_mode SET DEFAULT true;
    `);
    console.log("✓ Set default of allow_piece_mode column to true");

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
