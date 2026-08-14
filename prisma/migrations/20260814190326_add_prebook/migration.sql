-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "isPrebook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prebookReleaseAt" TIMESTAMP(3);

