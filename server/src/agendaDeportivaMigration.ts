import type { PrismaClient } from "@prisma/client";

export async function ensureAgendaDeportivaTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AgendaDeportivaEvento" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "eventDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3),
      "locality" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "organizer" TEXT NOT NULL DEFAULT '',
      "websiteUrl" TEXT NOT NULL DEFAULT '',
      "sports" "ActivityType"[] NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AgendaDeportivaEvento_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AgendaDeportivaEvento_eventDate_idx"
    ON "AgendaDeportivaEvento"("eventDate")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AgendaDeportivaEvento_isActive_idx"
    ON "AgendaDeportivaEvento"("isActive")
  `);
}