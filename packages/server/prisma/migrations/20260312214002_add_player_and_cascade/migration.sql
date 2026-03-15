/*
  Warnings:

  - A unique constraint covering the columns `[villageId,buildingId]` on the table `BuildingInstance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[x,y]` on the table `Village` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `BuildingInstance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BuildingInstance" DROP CONSTRAINT "BuildingInstance_villageId_fkey";

-- DropForeignKey
ALTER TABLE "Village" DROP CONSTRAINT "Village_playerId_fkey";

-- AlterTable
ALTER TABLE "BuildingInstance" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "level" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Village" ADD COLUMN     "food" DOUBLE PRECISION NOT NULL DEFAULT 100,
ALTER COLUMN "wood" SET DEFAULT 500,
ALTER COLUMN "clay" SET DEFAULT 500,
ALTER COLUMN "iron" SET DEFAULT 400;

-- CreateTable
CREATE TABLE "BuildingQueue" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "villageId" TEXT NOT NULL,

    CONSTRAINT "BuildingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingQueue_villageId_key" ON "BuildingQueue"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingInstance_villageId_buildingId_key" ON "BuildingInstance"("villageId", "buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Village_x_y_key" ON "Village"("x", "y");

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingInstance" ADD CONSTRAINT "BuildingInstance_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingQueue" ADD CONSTRAINT "BuildingQueue_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;
