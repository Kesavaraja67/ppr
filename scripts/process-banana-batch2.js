/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { config } = require('dotenv');
config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

const artifactsDir = `C:\\Users\\thank\\.gemini\\antigravity-ide\\brain\\c9a22d7e-dd68-4137-af1b-39b1d2350248`;
const targetDir = path.join(__dirname, '../public/curated');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const IMAGE_MAPPINGS = [
  {
    name_en: "Naattu Rasthali Banana",
    srcFile: "media__1785901313462.jpg",
    destName: "naattu_rasthali_banana.jpg",
    name_ta: "நாட்டு ரஸ்தாளி",
    category: "fruit",
    unit: "dozen",
  },
  {
    name_en: "Broccoli",
    srcFile: "media__1785901623563.jpg",
    destName: "broccoli.jpg",
    name_ta: "ப்ரோக்கோலி",
    category: "vegetable",
    unit: "kg",
  },
  {
    name_en: "Sapota",
    srcFile: "media__1785901699356.jpg",
    destName: "sapota.jpg",
    name_ta: "சப்போட்டா",
    category: "fruit",
    unit: "kg",
  },
  {
    name_en: "Strawberry",
    srcFile: "media__1785901792471.jpg",
    destName: "strawberry.jpg",
    name_ta: "ஸ்ட்ராபெர்ரி",
    category: "fruit",
    unit: "kg",
  },
];

async function processBatch2() {
  console.log("⏳ Processing & compressing Batch 2 produce images...");

  // 1. First, handle renaming old generic 'Banana' to 'Naadan Banana' and updating category to 'fruit'
  console.log("🔄 Migration: updating generic 'Banana' to 'Naadan Banana' (category: fruit)...");
  await db.execute(
    `UPDATE vegetables SET name_en = 'Naadan Banana', name_ta = 'நாடன் பழம்', category = 'fruit', in_stock = true WHERE name_en = 'Banana' OR name_en = 'Naadan Banana'`
  );
  console.log("  ✓ Renamed 'Banana' -> 'Naadan Banana' and moved to category 'fruit'");

  // 2. Compress images & upsert DB rows
  for (const item of IMAGE_MAPPINGS) {
    const srcPath = path.join(artifactsDir, item.srcFile);
    const destPath = path.join(targetDir, item.destName);

    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(destPath);

      const stat = fs.statSync(destPath);
      console.log(`  ✓ Compressed: ${item.destName} (${Math.round(stat.size / 1024)} KB)`);
    } else {
      console.warn(`  ⚠️ Source image file not found: ${srcPath}`);
    }

    const relUrl = `/curated/${item.destName}`;

    // Upsert database record
    const check = await db.execute(`SELECT id FROM vegetables WHERE name_en = '${item.name_en}' LIMIT 1`);
    if (check.length > 0) {
      await db.execute(
        `UPDATE vegetables SET name_ta = '${item.name_ta}', category = '${item.category}', unit = '${item.unit}', image_url = '${relUrl}', is_curated_image = true, allow_piece_mode = true, in_stock = true WHERE name_en = '${item.name_en}'`
      );
      console.log(`  ✓ DB updated for: ${item.name_en}`);
    } else {
      await db.execute(
        `INSERT INTO vegetables (name_en, name_ta, category, unit, image_url, is_curated_image, allow_piece_mode, in_stock) VALUES ('${item.name_en}', '${item.name_ta}', '${item.category}', '${item.unit}', '${relUrl}', true, true, true)`
      );
      console.log(`  + DB inserted: ${item.name_en}`);
    }
  }

  console.log("\n🎉 Batch 2 produce processing complete!");
}

processBatch2().catch((err) => {
  console.error("❌ Batch 2 processing failed:", err);
  process.exit(1);
});
