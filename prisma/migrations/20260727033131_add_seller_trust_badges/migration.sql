-- CreateEnum
CREATE TYPE "SellerBadgeTier" AS ENUM ('NEW', 'TRUSTED', 'TOP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "disputedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "badgeTier" "SellerBadgeTier" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "badgesCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "handlingDays" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "SellerFlag" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerFlag_sellerId_idx" ON "SellerFlag"("sellerId");

-- AddForeignKey
ALTER TABLE "SellerFlag" ADD CONSTRAINT "SellerFlag_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerFlag" ADD CONSTRAINT "SellerFlag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

