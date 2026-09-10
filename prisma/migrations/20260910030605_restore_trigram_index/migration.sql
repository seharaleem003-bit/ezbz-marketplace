-- Recreates the trigram index that powers typo-tolerant search.
--
-- Prisma's schema language cannot express a GIN trigram index, so
-- `migrate diff` does not know it should exist and proposes dropping it every
-- time the schema changes. It was dropped by the previous migration for
-- exactly that reason. If a future migration drops it again, add this file
-- back; search silently degrades to exact matching without it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Listing_title_trgm_idx" ON "Listing" USING GIN (title gin_trgm_ops);
