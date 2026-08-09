-- AlterTable
ALTER TABLE "NonprofitPartner" ADD COLUMN     "contactUserId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "NonprofitPartner_contactUserId_key" ON "NonprofitPartner"("contactUserId");

-- AddForeignKey
ALTER TABLE "NonprofitPartner" ADD CONSTRAINT "NonprofitPartner_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

