-- Create enums
CREATE TYPE "BookLanguage" AS ENUM ('ENGLISH', 'ARABIC', 'HAUSA', 'FULFULDE');
CREATE TYPE "BookFormat" AS ENUM ('BOOK', 'AUDIO', 'VIDEO');

-- Add columns with defaults so existing rows don't fail
ALTER TABLE "Book" ADD COLUMN "language" "BookLanguage" NOT NULL DEFAULT 'ARABIC';
ALTER TABLE "Book" ADD COLUMN "format"   "BookFormat"   NOT NULL DEFAULT 'BOOK';
