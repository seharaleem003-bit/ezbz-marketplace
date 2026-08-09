-- DropForeignKey
ALTER TABLE "HelpBoardContribution" DROP CONSTRAINT "HelpBoardContribution_needId_fkey";

-- AlterTable
ALTER TABLE "HelpBoardContribution" ALTER COLUMN "needId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HelpBoardContribution" ADD CONSTRAINT "HelpBoardContribution_needId_fkey" FOREIGN KEY ("needId") REFERENCES "HelpBoardNeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

