import { Prisma, PrismaClient } from "@prisma/client";
import { lockActivityForVar } from "./activityVarActivityLock.js";

export type VarSpeedReviewInput = {
  groupId: string;
  activityId: string;
  referenceSpeed: number;
  maximumMinutes: number;
  maxContinuousSeconds: number;
  minContinuousSeconds: number | null;
  referenceMinSpeed: number | null;
  reviewReason: string | null;
  needsReview: boolean;
};

export type VarSpeedReviewResult = {
  saved: boolean;
  reason: string | null;
};

export async function saveVarSpeedReview(
  prisma: PrismaClient,
  input: VarSpeedReviewInput
): Promise<VarSpeedReviewResult> {
  return prisma.$transaction(
    async (tx) => {
      await lockActivityForVar(tx, input.activityId);

      const activity = await tx.activity.findUnique({
        where: { id: input.activityId },
        select: {
          duplicateOfId: true,
          duplicates: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (
        !activity ||
        activity.duplicateOfId !== null ||
        activity.duplicates.length > 0
      ) {
        return {
          saved: false,
          reason: "Actividad vinculada a duplicados",
        };
      }

      const existing = await tx.groupActivityReview.findUnique({
        where: {
          groupId_activityId: {
            groupId: input.groupId,
            activityId: input.activityId,
          },
        },
        select: {
          resolvedAt: true,
        },
      });

      if (existing?.resolvedAt) {
        return {
          saved: false,
          reason: "Revision VAR ya resuelta",
        };
      }

      await tx.groupActivityReview.upsert({
        where: {
          groupId_activityId: {
            groupId: input.groupId,
            activityId: input.activityId,
          },
        },
        create: {
          ...input,
        },
        update: {
          referenceSpeed: input.referenceSpeed,
          maximumMinutes: input.maximumMinutes,
          maxContinuousSeconds: input.maxContinuousSeconds,
          minContinuousSeconds: input.minContinuousSeconds,
          referenceMinSpeed: input.referenceMinSpeed,
          reviewReason: input.reviewReason,
          needsReview: input.needsReview,
        },
      });

      return {
        saved: true,
        reason: null,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}