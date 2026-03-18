/*
  Warnings:

  - You are about to drop the column `lastUpdate` on the `Village` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Village" DROP COLUMN "lastUpdate",
ADD COLUMN     "ironMineLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastTick" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "quarryLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shieldUntil" TIMESTAMP(3),
ADD COLUMN     "timberCampLevel" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Troop" (
    "id" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "villageId" TEXT NOT NULL,

    CONSTRAINT "Troop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitQueue" (
    "id" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "trained" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "villageId" TEXT NOT NULL,

    CONSTRAINT "RecruitQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackReport" (
    "id" TEXT NOT NULL,
    "attackerVillageId" TEXT NOT NULL,
    "defenderVillageId" TEXT NOT NULL,
    "unitsSent" JSONB NOT NULL,
    "unitsSurvived" JSONB NOT NULL,
    "defenderUnitsBefore" JSONB NOT NULL,
    "defenderUnitsAfter" JSONB NOT NULL,
    "resourcesLooted" JSONB NOT NULL,
    "pointsLost" INTEGER NOT NULL DEFAULT 0,
    "pointsGained" INTEGER NOT NULL DEFAULT 0,
    "attackerWon" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttackReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Troop_villageId_unitType_key" ON "Troop"("villageId", "unitType");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitQueue_villageId_key" ON "RecruitQueue"("villageId");

-- AddForeignKey
ALTER TABLE "Troop" ADD CONSTRAINT "Troop_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitQueue" ADD CONSTRAINT "RecruitQueue_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttackReport" ADD CONSTRAINT "AttackReport_attackerVillageId_fkey" FOREIGN KEY ("attackerVillageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttackReport" ADD CONSTRAINT "AttackReport_defenderVillageId_fkey" FOREIGN KEY ("defenderVillageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;
