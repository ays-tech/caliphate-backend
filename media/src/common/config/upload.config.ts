import { UnsupportedMediaTypeException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const MB = 1024 * 1024;

// ── Allowed MIME types ────────────────────────────────────────────────
export const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const BOOK_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/epub+zip',
  // Images (scanned books / manuscripts)
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  // Audio
  'audio/mpeg',        // .mp3
  'audio/mp4',         // .m4a
  'audio/ogg',         // .ogg
  'audio/wav',         // .wav
  'audio/webm',        // .weba
  // Video
  'video/mp4',         // .mp4
  'video/webm',        // .webm
  'video/ogg',         // .ogv
  'video/quicktime',   // .mov
];

// ── Filter factories ──────────────────────────────────────────────────
const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!IMAGE_TYPES.includes(file.mimetype)) {
    return cb(
      new UnsupportedMediaTypeException(
        `"${file.originalname}" is not a valid image. Please upload JPEG, PNG, or WEBP.`,
      ),
      false,
    );
  }
  cb(null, true);
};

const bookFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!BOOK_FILE_TYPES.includes(file.mimetype)) {
    return cb(
      new UnsupportedMediaTypeException(
        `"${file.originalname}" is not a supported file type. Allowed: PDF, EPUB, MP3, MP4, WEBM, WAV, or image.`,
      ),
      false,
    );
  }
  cb(null, true);
};

// ── Upload options ────────────────────────────────────────────────────

/**
 * For scholar profile pictures and book covers.
 * Max 5 MB, images only.
 * NOTE: No `files` limit — multer counts ALL form fields toward the
 * files limit in some versions, causing spurious "Too many files" errors.
 * We only limit by fileSize.
 */
export const imageUploadOptions = {
  storage:    memoryStorage(),
  limits:     { fileSize: 5 * MB },
  fileFilter: imageFilter,
};

/**
 * For single volume file uploads (PDF / EPUB / audio / video / image).
 * Max 500 MB to accommodate large video lectures.
 */
export const bookFileUploadOptions = {
  storage:    memoryStorage(),
  limits:     { fileSize: 500 * MB },
  fileFilter: bookFileFilter,
};

/**
 * For the book CREATE endpoint which sends both a cover image
 * and a book file in a single multipart request.
 * No `files` count limit — only fileSize limits apply.
 * Per-field type validation is enforced in the service layer.
 */
export const createBookMultipartOptions = {
  storage:    memoryStorage(),
  limits:     { fileSize: 500 * MB },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const allowed = [...IMAGE_TYPES, ...BOOK_FILE_TYPES];
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `"${file.originalname}" is not a supported file type.`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};
