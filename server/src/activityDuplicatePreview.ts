import type { PrismaClient } from "@prisma/client";
import { checkDuplicateConfirmationGuard } from "./activityDuplicateConfirmationGuard.js";
import { organizeConfirmedDuplicates } from "./activityDuplicateGroup.js";
import { areActivitiesCompatible } from "./activityDuplicateCompatibility.js";

export async function previewActivityDuplicateConfirmation(
  prisma: PrismaClient,
  requesterId: string,
  activityIds: string[]
) {
  const guard = await checkDuplicateConfirmationGuard(
    prisma,
    requesterId,
    activityIds
  );

  if (!guard.allowed) {
    return {
      allowed: false as const,
      reason: guard.reason,
      primaryId: null,
      duplicateIds: [] as string[],
      activities: [],
    };
  }

  const activities = await prisma.activity.findMany({
    where: { id: { in: activityIds } },
    select: {
      id: true,
      userId: true,
      source: true,
      type: true,
      startDate: true,
      distance: true,
      movingTime: true,
      createdAt: true,
    },
  });

  // Verificacion adicional: misma disciplina deportiva.
  if (
    activities.length !== activityIds.length ||
    new Set(activities.map((a) => a.type)).size !== 1
  ) {
    return {
      allowed: false as const,
      reason: "Las actividades no pertenecen al mismo deporte",
      primaryId: null,
      duplicateIds: [] as string[],
      activities: [],
    };
  }

  // Todas las actividades deben ser compatibles entre si.
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      if (!areActivitiesCompatible(activities[i], activities[j])) {
        return {
          allowed: false as const,
          reason: "Las actividades no son compatibles como duplicados",
          primaryId: null,
          duplicateIds: [] as string[],
          activities: [],
        };
      }
    }
  }
  const organized = organizeConfirmedDuplicates(activities);

  return {
    allowed: true as const,
    reason: null,
    primaryId: organized.primary.id,
    duplicateIds: organized.duplicates.map((d) => d.activity.id),
    activities,
  };
}