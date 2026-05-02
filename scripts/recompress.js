/**
 * One-time script to recompress all existing images in /uploads/
 * to WebP format with proper sizing.
 *
 * Run on VPS:
 *   cd /var/www/caliphate-backend
 *   node scripts/recompress.js
 */

const path  = require('path');
const fs    = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('ERROR: sharp not installed. Run: npm install sharp');
  process.exit(1);
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const CONFIG = {
  scholars: { width: 400,  height: 400,  quality: 82 },
  covers:   { width: 600,  height: 900,  quality: 82 },
  avatars:  { width: 400,  height: 400,  quality: 82 },
};

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.JPG', '.JPEG', '.PNG']);

async function recompress() {
  console.log('\n=== CaliphateMakhtaba Image Recompressor ===\n');

  if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('No uploads directory found. Nothing to do.');
    return;
  }

  let totalProcessed = 0;
  let totalSavedKB   = 0;
  const errors       = [];

  for (const [folder, cfg] of Object.entries(CONFIG)) {
    const folderPath = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      console.log(`  Skipping ${folder}/ — directory not found`);
      continue;
    }

    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter(f => {
      const ext = path.extname(f);
      return IMAGE_EXTS.has(ext) || IMAGE_EXTS.has(ext.toLowerCase());
    });

    if (imageFiles.length === 0) {
      console.log(`  ${folder}/ — no images to compress`);
      continue;
    }

    console.log(`\n📁 ${folder}/ (${imageFiles.length} images)`);

    for (const fname of imageFiles) {
      const inPath  = path.join(folderPath, fname);
      const baseName = path.basename(fname, path.extname(fname));
      const outName = `${baseName}.webp`;
      const outPath = path.join(folderPath, outName);

      try {
        const beforeBytes = fs.statSync(inPath).size;
        const beforeKB    = (beforeBytes / 1024).toFixed(0);

        await sharp(inPath)
          .rotate()
          .resize(cfg.width, cfg.height, {
            fit:                'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: cfg.quality })
          .toFile(outPath);

        const afterBytes = fs.statSync(outPath).size;
        const afterKB    = (afterBytes / 1024).toFixed(0);
        const savedKB    = Math.round((beforeBytes - afterBytes) / 1024);
        const pct        = Math.round((1 - afterBytes / beforeBytes) * 100);

        // Remove original only after successful conversion
        fs.unlinkSync(inPath);

        console.log(`  ✓ ${fname} → ${outName}  ${beforeKB}KB → ${afterKB}KB  (${pct}% smaller, saved ${savedKB}KB)`);

        totalProcessed++;
        totalSavedKB += savedKB;
      } catch (err) {
        console.error(`  ✗ ${fname}: ${err.message}`);
        errors.push(`${folder}/${fname}: ${err.message}`);
        // Clean up failed output if it exists
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed:  ${totalProcessed} images`);
  console.log(`Space saved: ${totalSavedKB} KB (${(totalSavedKB / 1024).toFixed(1)} MB)`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n⚠️  NOTE: DB still has old .jpg/.png URLs.');
  console.log('Run the URL update SQL below to fix them:\n');
  console.log('-- Run in psql:');

  // Generate SQL to update all .jpg/.jpeg/.png URLs to .webp
  for (const folder of Object.keys(CONFIG)) {
    console.log(`UPDATE "Scholar" SET "pictureUrl" = REPLACE(REPLACE(REPLACE("pictureUrl", '.jpg', '.webp'), '.jpeg', '.webp'), '.png', '.webp') WHERE "pictureUrl" LIKE '%/uploads/${folder}/%';`);
    console.log(`UPDATE "Book" SET "coverUrl" = REPLACE(REPLACE(REPLACE("coverUrl", '.jpg', '.webp'), '.jpeg', '.webp'), '.png', '.webp') WHERE "coverUrl" LIKE '%/uploads/${folder}/%';`);
  }
}

recompress().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
