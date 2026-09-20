BEGIN;

CREATE TYPE "ActivitySource" AS ENUM (
  'STRAVA',
  'GOOGLE_HEALTH',
  'RIDE_WITH_GPS',
  'IGPSPORT'
);

ALTER TABLE "Activity"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "source" "ActivitySource" NOT NULL DEFAULT 'STRAVA';

UPDATE "Activity"
SET "externalId" = "stravaId"
WHERE "externalId" IS NULL;

ALTER TABLE "Activity"
  ALTER COLUMN "externalId" SET NOT NULL,
  ALTER COLUMN "stravaId" DROP NOT NULL;

CREATE UNIQUE INDEX "Activity_source_externalId_key"
ON "Activity"("source", "externalId");

COMMIT;