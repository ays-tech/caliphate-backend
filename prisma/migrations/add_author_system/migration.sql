-- Add AUTHOR to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AUTHOR';

-- Create AuthorStatus enum
DO $$ BEGIN
  CREATE TYPE "AuthorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add DRAFT to BookStatus enum
ALTER TYPE "BookStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- Create AuthorProfile table
CREATE TABLE IF NOT EXISTS "AuthorProfile" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "penName"    TEXT         NOT NULL,
  "bio"        TEXT,
  "avatarUrl"  TEXT,
  "status"     "AuthorStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "createdAt"  TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP    NOT NULL DEFAULT NOW(),
  "userId"     TEXT         NOT NULL,
  CONSTRAINT "AuthorProfile_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "AuthorProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "AuthorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuthorProfile_status_idx" ON "AuthorProfile"("status");

-- Add new columns to Book
ALTER TABLE "Book"
  ADD COLUMN IF NOT EXISTS "authorProfileId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNote"      TEXT;

-- Add foreign key for authorProfileId
DO $$ BEGIN
  ALTER TABLE "Book"
    ADD CONSTRAINT "Book_authorProfileId_fkey"
    FOREIGN KEY ("authorProfileId") REFERENCES "AuthorProfile"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Update existing books: PENDING → keep as PENDING (already valid in new enum)
-- New default for Book.status is DRAFT but we only apply to NEW books

CREATE INDEX IF NOT EXISTS "Book_status_idx"          ON "Book"("status");
CREATE INDEX IF NOT EXISTS "Book_authorProfileId_idx" ON "Book"("authorProfileId");
