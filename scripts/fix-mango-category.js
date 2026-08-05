/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require('dotenv');
config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function fixMangoCategory() {
  await sql`UPDATE vegetables SET category = 'fruit' WHERE lower(name_en) = 'mango'`;
  console.log("  ✓ Updated Mango category to 'fruit' in Neon DB");
}

fixMangoCategory().catch(console.error);
