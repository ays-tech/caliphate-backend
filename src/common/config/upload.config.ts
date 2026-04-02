import { UnsupportedMediaTypeException, PayloadTooLargeException } from '@nestjs/common';
import { memoryStorage } from 'multer';

// ── Allowed MIME types per upload context ────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_BOOK_TYPES  = [
  'application/pdf',
  'application/epub+zip',
  'image/jpeg',
  'image/png',
  'image/webp',
];

// ── Size limits ───────────────────────────────────────────────────────
const MB = 1024 * 1024;
export const MAX_IMAGE_SIZE = 5 * MB;   //  5 MB  — profile/cover images
export const MAX_BOOK_SIZE  = 100 * MB; // 100 MB — PDF / EPUB volumes

// ── Reusable multer options ───────────────────────────────────────────

/** For profile pictures and book cover images (max 5 MB, images only) */
export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `Invalid file type "${file.mimetype}". Allowed: JPEG, PNG, WEBP, GIF.`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};

/** For book volumes — PDF, EPUB, or images (max 100 MB) */
export const bookFileUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_BOOK_SIZE, files: 1 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!ALLOWED_BOOK_TYPES.includes(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `Invalid file type "${file.mimetype}". Allowed: PDF, EPUB, JPEG, PNG, WEBP.`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};
