import type { PrismaClient } from "@prisma/client";

export type DuplicateVarGuardResult = {
  allowed: boolean;
  reviews: number;
  penalties: number;
  resolutions: number;
};

export async function checkDuplicateVarGuard(
  prisma: PrismaClient,
  activityIds: string[]
): Promise<DuplicateVarGuardResult> {
  if (
    activityIds.length === 0 ||
    activityIds.some((id) => !id.trim()) ||
    new Set(activityIds).size !== activityIds.length
  ) {
    throw new Error("Identificadores de actividad invalidos");
  }

  const [reviews, penalties, resolutions] =
    await Promise.all([
      prisma.groupActivityReview.count({
        where: { activityId: { in: activityIds } },
      }),
      prisma.groupActivityPenalty.count({
        where: { activityId: { in: activityIds } },
      }),
      prisma.groupActivityVarResolution.count({
        where: {
          OR: [
            { firstActivityId: { in: activityIds } },
            { secondActivityId: { in: activityIds } },
          ],
        },
      }),
    ]);

  return {
    allowed:
      reviews === 0 &&
      penalties === 0 &&
      resolutions === 0,
    reviews,
    penalties,
    resolutions,
  };
}