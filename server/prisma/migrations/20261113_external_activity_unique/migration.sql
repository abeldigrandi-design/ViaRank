-- Impedir actividades ADMIN duplicadas.
-- Este indice ya fue creado manualmente en Neon production.
CREATE UNIQUE INDEX "GroupExternalActivity_no_duplicates_idx"
ON "GroupExternalActivity" (
    "groupId",
    "userId",
    "startDate",
    "endDate",
    "distance"
);