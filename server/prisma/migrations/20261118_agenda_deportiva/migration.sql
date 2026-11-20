CREATE TABLE "AgendaDeportivaEvento" (
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
);

CREATE INDEX "AgendaDeportivaEvento_eventDate_idx"
ON "AgendaDeportivaEvento"("eventDate");

CREATE INDEX "AgendaDeportivaEvento_isActive_idx"
ON "AgendaDeportivaEvento"("isActive");