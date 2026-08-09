-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT;

