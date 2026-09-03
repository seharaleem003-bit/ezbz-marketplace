-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "publishedAt" TIMESTAMP(3);


-- Existing published listings predate this column; fall back to when they
-- were created so the column isn't blank for the whole catalogue.
UPDATE "Listing" SET "publishedAt" = "createdAt" WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;
