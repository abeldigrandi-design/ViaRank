import { Prisma, PrismaClient } from "@prisma/client";
import { checkDuplicateConfirmationGuard } from "./activityDuplicateConfirmationGuard.js";
import { organizeConfirmedDuplicates } from "./activityDuplicateGroup.js";
import { areActivitiesCompatible } from "./activityDuplicateCompatibility.js";

export type DuplicateTransactionResult = {
  allowed: boolean;
  reason: string | null;
  primaryId: string | null;
  duplicateIds: string[];
};

export async function prepareDuplicateTransaction(
  prisma: PrismaClient,
  requesterId: string,
  activityIds: string[]
): Promise<DuplicateTransactionResult> {
  return prisma.$transaction(
    async (tx) => {
      // Este servicio es solo de lectura.
      // Se adapta el cliente transaccional a las funciones existentes.
      const client = tx as unknown as PrismaClient;

      const guard = await checkDuplicateConfirmationGuard(
        client,
        requesterId,
        activityIds
      );

      if (!guard.allowed) {
        return {
          allowed: false,
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
          allowed: false,
          reason: "No se encontraron todas las actividades",
          primaryId: null,
          duplicateIds: [],
        };
      }

      for (let i = 0; i < activities.length; i++) {
        for (let j = i + 1; j < activities.length; j++) {
          if (!areActivitiesCompatible(activities[i], activities[j])) {
            return {
              allowed: false,
              reason: "Las actividades no son compatibles",
              primaryId: null,
              duplicateIds: [],
            };
          }
        }
      }

      const organized = organizeConfirmedDuplicates(activities);

      return {
        allowed: true,
        reason: null,
        primaryId: organized.primary.id,
        duplicateIds: organized.duplicates.map((d) => d.activity.id),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}