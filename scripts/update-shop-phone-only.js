/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require('dotenv');
config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function updateShopPhoneOnly() {
  console.log("⏳ Updating shop_config phone_number to 6382366080 in DB (leaving admin login untouched)...");

  await sql`UPDATE shop_config SET phone_number = '6382366080'`;
  console.log("  ✓ Updated shop_config.phone_number to '6382366080'");

  const adminRows = await sql`SELECT id, phone, name FROM admins WHERE phone = '8870187248'`;
  console.log("  ✓ Verified admin login phone remains unchanged:", adminRows);
}

updateShopPhoneOnly().catch(console.error);
