import { Prisma, PrismaClient } from "@prisma/client";
import { lockActivityForVar } from "./activityVarActivityLock.js";

export async function resolveVarSpeedReview(
  prisma: PrismaClient,
  groupId: string,
  reviewId: string,
  requesterId: string
) {
  if (!groupId?.trim() || !reviewId?.trim() || !requesterId?.trim()) {
    return null;
  }

  return prisma.$transaction(
    async (tx) => {
      const initialReview = await tx.groupActivityReview.findFirst({
        where: { id: reviewId, groupId },
        select: { activityId: true },
      });

      if (!initialReview) {
        return null;
      }

      await lockActivityForVar(tx, initialReview.activityId);

      const review = await tx.groupActivityReview.findFirst({
        where: {
          id: reviewId,
          groupId,
          activityId: initialReview.activityId,
        },
      });

      if (!review) {
        return null;
      }

      return tx.groupActivityReview.update({
        where: { id: review.id },
        data: {
          needsReview: false,
          resolvedAt: review.resolvedAt ?? new Date(),
          resolvedById: review.resolvedById ?? requesterId,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}