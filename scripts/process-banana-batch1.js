/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { config } = require('dotenv');
config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { eq } = require('drizzle-orm');

const artifactsDir = `C:\\Users\\thank\\.gemini\\antigravity-ide\\brain\\c9a22d7e-dd68-4137-af1b-39b1d2350248`;
const targetDir = path.join(__dirname, '../public/curated');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const BATCH1_MAPPINGS = [
  {
    name_en: "Glucose Banana",
    srcFile: "media__1785900917684.jpg",
    destName: "glucose_banana.jpg",
  },
  {
    name_en: "Nendran Banana",
    srcFile: "media__1785900944213.jpg",
    destName: "nendran_banana.jpg",
  },
  {
    name_en: "Red Banana (Sevvaazhai)",
    srcFile: "media__1785900970471.jpg",
    destName: "red_banana.jpg",
  },
  {
    name_en: "Poovan Banana",
    srcFile: "media__1785900992008.jpg",
    destName: "poovan_banana.jpg",
  },
  {
    name_en: "Karpooravalli Banana",
    srcFile: "media__1785901021376.jpg",
    destName: "karpooravalli_banana.jpg",
  },
];

async function processBatch1() {
  console.log("⏳ Processing & compressing Batch 1 banana images...");

  for (const item of BATCH1_MAPPINGS) {
    const srcPath = path.join(artifactsDir, item.srcFile);
    const destPath = path.join(targetDir, item.destName);

    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️ Source image missing: ${srcPath}`);
      continue;
    }

    // Compress with Sharp
    await sharp(srcPath)
      .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(destPath);

    const stat = fs.statSync(destPath);
    console.log(`  ✓ Compressed: ${item.destName} (${Math.round(stat.size / 1024)} KB)`);

    // Update DB row image_url
    const relUrl = `/curated/${item.destName}`;
    const result = await db
      .execute(
        `UPDATE vegetables SET image_url = '${relUrl}', is_curated_image = true, in_stock = true WHERE name_en = '${item.name_en}'`
      );
    console.log(`  ✓ DB updated for: ${item.name_en} -> ${relUrl}`);
  }

  console.log("\n🎉 Batch 1 banana processing complete!");
}

processBatch1().catch((err) => {
  console.error("❌ Batch 1 processing failed:", err);
  process.exit(1);
});
