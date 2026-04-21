-- Add SCHOLAR role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SCHOLAR';

-- Create ScholarClaimStatus enum
DO $$ BEGIN
  CREATE TYPE "ScholarClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add DRAFT to BookStatus
ALTER TYPE "BookStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- Add claim fields to Scholar
ALTER TABLE "Scholar"
  ADD COLUMN IF NOT EXISTS "userId"      TEXT,
  ADD COLUMN IF NOT EXISTS "claimStatus" "ScholarClaimStatus",
  ADD COLUMN IF NOT EXISTS "reviewNote"  TEXT;

DO $$ BEGIN
  ALTER TABLE "Scholar" ADD CONSTRAINT "Scholar_userId_key" UNIQUE ("userId");
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Scholar" ADD CONSTRAINT "Scholar_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "Scholar_claimStatus_idx" ON "Scholar"("claimStatus");

-- Add reviewNote to Book
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;

-- Remove AuthorProfile artifacts
DO $$ BEGIN
  ALTER TABLE "Book" DROP CONSTRAINT IF EXISTS "Book_authorProfileId_fkey";
EXCEPTION WHEN others THEN null; END $$;
ALTER TABLE "Book" DROP COLUMN IF EXISTS "authorProfileId";
DROP INDEX  IF EXISTS "Book_authorProfileId_idx";
DROP TABLE  IF EXISTS "AuthorProfile";
DO $$ BEGIN DROP TYPE "AuthorStatus"; EXCEPTION WHEN others THEN null; END $$;

-- Promote any AUTHOR users to SCHOLAR
UPDATE "User" SET "role" = 'SCHOLAR' WHERE "role" = 'AUTHOR';
