import type { Prisma } from "@prisma/client";

export async function lockActivityForVar(
  tx: Prisma.TransactionClient,
  activityId: string
): Promise<void> {
  if (typeof activityId !== "string" || !activityId.trim()) {
    throw new Error("Identificador de actividad invalido");
  }

  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Activity"
    WHERE id = ${activityId}
    FOR UPDATE
  `;

  if (rows.length !== 1) {
    throw new Error("Actividad inexistente durante el bloqueo VAR");
  }
}