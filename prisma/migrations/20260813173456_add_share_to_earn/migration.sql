-- AlterEnum
ALTER TYPE "CreditReason" ADD VALUE 'SHARE_COMMISSION';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shareCommissionCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shareCommissionPaidAt" TIMESTAMP(3),
ADD COLUMN     "shareReferrerUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shareReferrerUserId_fkey" FOREIGN KEY ("shareReferrerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

