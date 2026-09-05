-- Typo-tolerant search. Shoppers type "chandiliers"; exact substring matching
-- returns nothing, which reads as an empty shop rather than a misspelling.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Supports word_similarity() lookups against the product name.
CREATE INDEX IF NOT EXISTS "Listing_title_trgm_idx" ON "Listing" USING GIN (title gin_trgm_ops);
