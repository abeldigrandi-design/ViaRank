import { Prisma, PrismaClient } from "@prisma/client";
import { checkDuplicateConfirmationGuard } from "./activityDuplicateConfirmationGuard.js";
import { organizeConfirmedDuplicates } from "./activityDuplicateGroup.js";
import { areActivitiesCompatible } from "./activityDuplicateCompatibility.js";
import { lockActivitiesForDuplicateDecision } from "./activityDuplicateLock.js";

export type ConfirmDuplicatesResult = {
  confirmed: boolean;
  reason: string | null;
  primaryId: string | null;
  duplicateIds: string[];
};

export async function confirmActivityDuplicates(
  prisma: PrismaClient,
  requesterId: string,
  activityIds: string[],
  explicitConfirmation: boolean
): Promise<ConfirmDuplicatesResult> {
  if (explicitConfirmation !== true) {
    return {
      confirmed: false,
      reason: "Se requiere confirmacion explicita",
      primaryId: null,
      duplicateIds: [],
    };
  }

  return prisma.$transaction(
    async (tx) => {
      const client = tx as unknown as PrismaClient;

      if (
        !Array.isArray(activityIds) ||
        activityIds.length < 2 ||
        activityIds.some(
          (id) => typeof id !== "string" || !id.trim()
        ) ||
        new Set(activityIds).size !== activityIds.length
      ) {
        return {
          confirmed: false,
          reason: "Se requieren al menos dos actividades diferentes",
          primaryId: null,
          duplicateIds: [],
        };
      }

      // Bloquear antes de comprobar las protecciones.
      await lockActivitiesForDuplicateDecision(tx, activityIds);

      const guard = await checkDuplicateConfirmationGuard(
        client,
        requesterId,
        activityIds
      );

      if (!guard.allowed) {
        return {
          confirmed: false,
          reason: guard.reason,
          primaryId: null,
          duplicateIds: [],
        };
      }


      const activities = await tx.activity.findMany({
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

      if (activities.length !== activityIds.length) {
        return {
          confirmed: false,
          reason: "No se encontraron todas las actividades",
          primaryId: null,
          duplicateIds: [],
        };
      }

      for (let i = 0; i < activities.length; i++) {
        for (let j = i + 1; j < activities.length; j++) {
          if (!areActivitiesCompatible(activities[i], activities[j])) {
            return {
              confirmed: false,
              reason: "Las actividades no son compatibles",
              primaryId: null,
              duplicateIds: [],
            };
          }
        }
      }

      const organized = organizeConfirmedDuplicates(activities);

      const duplicateIds = organized.duplicates.map(
        (item) => item.activity.id
      );

      const result = await tx.activity.updateMany({
        where: {
          id: { in: duplicateIds },
          duplicateOfId: null,
        },
        data: {
          duplicateOfId: organized.primary.id,
        },
      });

      if (result.count !== duplicateIds.length) {
        throw new Error(
          "Conflicto al confirmar duplicados. Transaccion revertida."
        );
      }

      return {
        confirmed: true,
        reason: null,
        primaryId: organized.primary.id,
        duplicateIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}