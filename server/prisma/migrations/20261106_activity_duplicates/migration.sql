-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "duplicateOfId" TEXT;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
