import {
  Injectable, InternalServerErrorException, Logger, OnModuleInit,
} from '@nestjs/common';
import * as fs   from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// sharp loaded at runtime so missing package gives a clear warning
// instead of crashing the build
let sharp: any = null;
try { sharp = require('sharp'); } catch { /* not installed */ }

const IMAGE_MIMETYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif',
]);

// Max dimensions per folder type
const IMAGE_CONFIG: Record<string, { width: number; height: number; quality: number }> = {
  scholars: { width: 400,  height: 400,  quality: 82 }, // profile photos — square crop
  covers:   { width: 600,  height: 900,  quality: 82 }, // book covers — portrait
  avatars:  { width: 400,  height: 400,  quality: 82 }, // same as scholars
  default:  { width: 1200, height: 1200, quality: 80 }, // anything else
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger    = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly baseUrl   = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

  onModuleInit() {
    for (const folder of ['covers', 'scholars', 'volumes', 'avatars']) {
      const dir = path.join(this.uploadDir, folder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created: ${dir}`);
      }
    }

    if (!sharp) {
      this.logger.warn(
        'sharp not installed — images will be saved uncompressed.\n' +
        'Run: npm install sharp   to enable automatic compression.',
      );
    } else {
      this.logger.log('Image compression ready (sharp ✓)');
    }

    this.logger.log(`Storage → ${this.uploadDir}`);
    this.logger.log(`Base URL → ${this.baseUrl}/uploads/`);
  }

  // ── Sanitise filename ─────────────────────────────────────────────────
  private sanitise(original: string): string {
    const parts = original.split('.');
    const ext   = (parts.length > 1 ? parts.pop()! : 'bin').toLowerCase().slice(0, 10);
    const base  = parts.join('-')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'file';
    return `${base}.${ext}`;
  }

  // ── Upload ────────────────────────────────────────────────────────────
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer?.length) {
      throw new InternalServerErrorException('File buffer is empty');
    }

    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const isImage = IMAGE_MIMETYPES.has(file.mimetype);

    // ── Compress images with sharp ───────────────────────────────────
    if (isImage && sharp) {
      const cfg      = IMAGE_CONFIG[folder] || IMAGE_CONFIG.default;
      const filename = `${uuidv4()}.webp`;
      const filePath = path.join(folderPath, filename);
      const before   = file.size;

      await sharp(file.buffer)
        .rotate()                        // auto-rotate from EXIF
        .resize(cfg.width, cfg.height, {
          fit:         'inside',         // never upscale, keep aspect ratio
          withoutEnlargement: true,
        })
        .webp({ quality: cfg.quality })  // convert everything to WebP
        .toFile(filePath);

      const after = fs.statSync(filePath).size;
      this.logger.log(
        `Compressed ${folder}/${filename}: ` +
        `${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB ` +
        `(${Math.round((1 - after / before) * 100)}% smaller)`,
      );

      return `${this.baseUrl}/uploads/${folder}/${filename}`;
    }

    // ── Non-image files (PDFs, audio, video) — save as-is ────────────
    const filename = `${uuidv4()}-${this.sanitise(file.originalname)}`;
    const filePath = path.join(folderPath, filename);
    const sizeMB   = (file.size / 1_048_576).toFixed(2);

    this.logger.log(`Saving ${folder}/${filename} (${sizeMB} MB)…`);
    await fs.promises.writeFile(filePath, file.buffer);
    this.logger.log(`Saved OK: ${folder}/${filename}`);

    return `${this.baseUrl}/uploads/${folder}/${filename}`;
  }

  // ── Signed URL (local disk = public URL, no signing needed) ──────────
  async getSignedUrl(fileUrl: string, _expiresIn = 3_600): Promise<string> {
    return fileUrl;
  }

  // ── Delete ────────────────────────────────────────────────────────────
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    let filePath: string;
    if (fileUrl.startsWith('http')) {
      try {
        const u        = new URL(fileUrl);
        const relative = u.pathname.replace(/^\/uploads\//, '');
        filePath       = path.join(this.uploadDir, relative);
      } catch { return; }
    } else {
      filePath = path.join(this.uploadDir, fileUrl);
    }

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted: ${filePath}`);
      }
    } catch (e: any) {
      this.logger.warn(`Delete failed ${filePath}: ${e.message}`);
    }
  }

  // ── Bulk recompress existing images (run once via admin endpoint) ─────
  async recompressExisting(): Promise<{ processed: number; saved: number; errors: string[] }> {
    if (!sharp) throw new InternalServerErrorException('sharp not installed');

    const imageFolders = ['scholars', 'covers', 'avatars'];
    let processed = 0;
    let savedBytes = 0;
    const errors: string[] = [];

    for (const folder of imageFolders) {
      const folderPath = path.join(this.uploadDir, folder);
      if (!fs.existsSync(folderPath)) continue;

      const files = fs.readdirSync(folderPath);
      const cfg   = IMAGE_CONFIG[folder] || IMAGE_CONFIG.default;

      for (const fname of files) {
        // Skip already-webp files that are small (already processed)
        if (fname.endsWith('.webp')) continue;

        const ext = path.extname(fname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) continue;

        const inPath  = path.join(folderPath, fname);
        const outName = `${path.basename(fname, ext)}.webp`;
        const outPath = path.join(folderPath, outName);

        try {
          const before = fs.statSync(inPath).size;

          await sharp(inPath)
            .rotate()
            .resize(cfg.width, cfg.height, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: cfg.quality })
            .toFile(outPath);

          const after = fs.statSync(outPath).size;
          savedBytes += (before - after);
          processed++;

          // Remove original
          fs.unlinkSync(inPath);
          this.logger.log(`Recompressed: ${folder}/${fname} → ${outName} (saved ${((before - after) / 1024).toFixed(0)} KB)`);
        } catch (e: any) {
          errors.push(`${folder}/${fname}: ${e.message}`);
        }
      }
    }

    return {
      processed,
      saved:  Math.round(savedBytes / 1024),  // KB saved
      errors,
    };
  }
}
