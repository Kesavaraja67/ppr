/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require('dotenv');
config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function checkPhoneNumbers() {
  console.log("Checking DB tables for 8870187248...");

  const shopConfigs = await sql`SELECT * FROM shop_config`;
  console.log("shop_config rows:", shopConfigs);

  const admins = await sql`SELECT id, phone, name, role FROM admins`;
  console.log("admins rows:", admins);
}

checkPhoneNumbers().catch(console.error);
