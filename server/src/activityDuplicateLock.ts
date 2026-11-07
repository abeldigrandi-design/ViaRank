import type { Prisma } from "@prisma/client";

/**
 * Bloquea las filas de las actividades durante la transaccion.
 *
 * Debe ejecutarse dentro de una transaccion activa.
 * Los IDs se ordenan para mantener un orden consistente.
 *
 * Este bloqueo solo coordina operaciones que respeten
 * el mismo protocolo transaccional.
 */
export async function lockActivitiesForDuplicateDecision(
  tx: Prisma.TransactionClient,
  activityIds: string[]
): Promise<void> {
  if (
    activityIds.length < 2 ||
    activityIds.some((id) => !id.trim()) ||
    new Set(activityIds).size !== activityIds.length
  ) {
    throw new Error("Identificadores de actividad invalidos");
  }

  const sortedIds = [...activityIds].sort();

  for (const activityId of sortedIds) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Activity"
      WHERE id = ${activityId}
      FOR UPDATE
    `;

    if (rows.length !== 1) {
      throw new Error("Actividad inexistente durante el bloqueo");
    }
  }
}