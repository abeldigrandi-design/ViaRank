import type { PrismaClient } from "@prisma/client";
import { canConfirmActivityDuplicates } from "./activityDuplicateAuthorization.js";
import { checkDuplicateVarGuard } from "./activityDuplicateVarGuard.js";
import { checkDuplicateLinkGuard } from "./activityDuplicateLinkGuard.js";

export type DuplicateConfirmationGuardResult = {
  allowed: boolean;
  reason: string | null;
};

export async function checkDuplicateConfirmationGuard(
  prisma: PrismaClient,
  requesterId: string,
  activityIds: string[]
): Promise<DuplicateConfirmationGuardResult> {
  const authorized = await canConfirmActivityDuplicates(
    prisma,
    requesterId
  );

  if (!authorized) {
    return {
      allowed: false,
      reason: "Solo un SUPER_ADMIN activo puede confirmar duplicados",
    };
  }

  const links = await checkDuplicateLinkGuard(
    prisma,
    activityIds
  );

  if (!links.allowed) {
    return {
      allowed: false,
      reason: links.reason,
    };
  }

  const varGuard = await checkDuplicateVarGuard(
    prisma,
    activityIds
  );

  if (!varGuard.allowed) {
    return {
      allowed: false,
      reason: "Existen registros del VAR asociados a las actividades",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}