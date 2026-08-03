/**
 * migrate-add-idempotency.ts
 * Adds client_request_id column + unique constraint + FK indexes to production DB.
 * Run with: npx tsx drizzle/migrate-add-idempotency.ts
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

    // 1. Add client_request_id column (nullable so existing rows are unaffected)
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS client_request_id TEXT;
    `);
    console.log("✓ Added client_request_id column");

    // 2. Add unique constraint (safe because all existing values are NULL)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'orders_client_request_id_unique'
        ) THEN
          ALTER TABLE orders ADD CONSTRAINT orders_client_request_id_unique UNIQUE (client_request_id);
        END IF;
      END $$;
    `);
    console.log("✓ Added unique constraint on client_request_id");

    // 3. FK indexes (IF NOT EXISTS so safe to re-run)
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_addresses_user_id  ON addresses (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_address_id   ON orders (address_id)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_veg_id  ON order_items (veg_id)`,
    ];
    for (const sql of indexes) {
      await client.query(sql);
      console.log(`✓ ${sql.split("idx_")[1]?.split(" ")[0]}`);
    }

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
