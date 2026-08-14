-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "prebookDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PrebookNotifyRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrebookNotifyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrebookNotifyRequest_listingId_notifiedAt_idx" ON "PrebookNotifyRequest"("listingId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrebookNotifyRequest_listingId_email_key" ON "PrebookNotifyRequest"("listingId", "email");

-- AddForeignKey
ALTER TABLE "PrebookNotifyRequest" ADD CONSTRAINT "PrebookNotifyRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrebookNotifyRequest" ADD CONSTRAINT "PrebookNotifyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

