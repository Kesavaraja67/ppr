/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, '../public/curated');
const files = fs.readdirSync(dir);

async function compressAll() {
  console.log('⏳ Starting image compression for public/curated...');
  for (const file of files) {
    if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.size > 15 * 1024) {
      const tempPath = filePath + '.tmp.jpg';
      
      await sharp(filePath)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 75, mozjpeg: true })
        .toFile(tempPath);
      
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
      const newStat = fs.statSync(filePath);
      console.log(`✅ ${file}: ${Math.round(stat.size / 1024)} KB → ${Math.round(newStat.size / 1024)} KB`);
    }
  }
  console.log('✨ Compression complete!');
}

compressAll().catch(err => {
  console.error('❌ Compression failed:', err);
  process.exit(1);
});
