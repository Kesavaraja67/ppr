/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require('dotenv');
config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function updateDbPhone() {
  console.log("⏳ Updating shop phone number in Neon DB...");

  await sql`UPDATE shop_config SET phone_number = '6382366080' WHERE phone_number = '8870187248' OR phone_number = '9443721544' OR phone_number IS NOT NULL`;
  console.log("  ✓ Updated shop_config.phone_number to '6382366080'");

  await sql`UPDATE admins SET phone = '6382366080' WHERE phone = '8870187248'`;
  console.log("  ✓ Updated admins.phone to '6382366080' for owner Jayaraman P (PIN unchanged)");

  console.log("🎉 DB phone update complete!");
}

updateDbPhone().catch(console.error);
