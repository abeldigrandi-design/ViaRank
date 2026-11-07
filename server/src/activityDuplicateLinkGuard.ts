import type { PrismaClient } from "@prisma/client";

export type DuplicateLinkGuardResult = {
  allowed: boolean;
  reason: string | null;
};

export async function checkDuplicateLinkGuard(
  prisma: PrismaClient,
  activityIds: string[]
): Promise<DuplicateLinkGuardResult> {
  if (
    activityIds.length < 2 ||
    activityIds.some((id) => !id.trim()) ||
    new Set(activityIds).size !== activityIds.length
  ) {
    return {
      allowed: false,
      reason: "Se requieren al menos dos actividades diferentes",
    };
  }

  const activities = await prisma.activity.findMany({
    where: { id: { in: activityIds } },
    select: {
      id: true,
      userId: true,
      source: true,
      duplicateOfId: true,
      duplicates: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (activities.length !== activityIds.length) {
    return {
      allowed: false,
      reason: "Una o mas actividades no existen",
    };
  }

  if (new Set(activities.map((a) => a.userId)).size !== 1) {
    return {
      allowed: false,
      reason: "Las actividades pertenecen a atletas diferentes",
    };
  }

  if (new Set(activities.map((a) => a.source)).size !== activities.length) {
    return {
      allowed: false,
      reason: "Hay actividades de la misma fuente",
    };
  }

  if (activities.some((a) => a.duplicateOfId !== null)) {
    return {
      allowed: false,
      reason: "Una actividad ya esta marcada como duplicada",
    };
  }

  if (activities.some((a) => a.duplicates.length > 0)) {
    return {
      allowed: false,
      reason: "Una actividad ya tiene duplicados asociados",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}