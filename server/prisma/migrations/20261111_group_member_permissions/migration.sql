-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "canManageVar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canRemoveMembers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canValidateExternalKm" BOOLEAN NOT NULL DEFAULT false;
