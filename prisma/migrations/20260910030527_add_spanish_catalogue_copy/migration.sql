-- DropIndex
DROP INDEX "Listing_title_trgm_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "nameEs" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "descriptionEs" TEXT,
ADD COLUMN     "titleEs" TEXT;

