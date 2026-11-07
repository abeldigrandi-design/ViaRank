import type { PrismaClient } from "@prisma/client";

export async function canConfirmActivityDuplicates(
  prisma: PrismaClient,
  requesterId: string
): Promise<boolean> {
  if (!requesterId || !requesterId.trim()) {
    return false;
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: {
      role: true,
      isActive: true,
    },
  });

  return (
    requester?.role === "SUPER_ADMIN" &&
    requester.isActive === true
  );
}