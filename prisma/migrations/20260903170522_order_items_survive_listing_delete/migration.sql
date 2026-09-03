-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_listingId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "listingId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

