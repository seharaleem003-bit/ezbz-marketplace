-- DropIndex
DROP INDEX "Order_stripeCheckoutSessionId_key";

-- DropIndex
DROP INDEX "Order_stripePaymentIntentId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stripeTransferId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeTransferId_key" ON "Order"("stripeTransferId");

-- CreateIndex
CREATE INDEX "Order_stripeCheckoutSessionId_idx" ON "Order"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");

