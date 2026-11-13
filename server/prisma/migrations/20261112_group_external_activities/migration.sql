-- CreateTable
CREATE TABLE "GroupExternalActivity" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupExternalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupExternalActivity_groupId_userId_idx" ON "GroupExternalActivity"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupExternalActivity_groupId_startDate_idx" ON "GroupExternalActivity"("groupId", "startDate");

-- AddForeignKey
ALTER TABLE "GroupExternalActivity" ADD CONSTRAINT "GroupExternalActivity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SportGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupExternalActivity" ADD CONSTRAINT "GroupExternalActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupExternalActivity" ADD CONSTRAINT "GroupExternalActivity_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
