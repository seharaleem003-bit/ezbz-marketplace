-- Factory-sealed condition, distinct from Open Box.
ALTER TYPE "ListingCondition" ADD VALUE 'NEW_IN_BOX';

-- New listings start with one unit rather than zero (sold out).
ALTER TABLE "Listing" ALTER COLUMN "inventoryQty" SET DEFAULT 1;
