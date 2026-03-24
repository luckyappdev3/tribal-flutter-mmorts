-- Drop old RecruitQueue (unique constraint on villageId)
DROP TABLE IF EXISTS "RecruitQueue";

-- Create new RecruitQueue with parallel support
CREATE TABLE "RecruitQueue" (
    "id"           TEXT NOT NULL,
    "buildingType" TEXT NOT NULL,
    "unitType"     TEXT NOT NULL,
    "totalCount"   INTEGER NOT NULL,
    "trainedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextUnitAt"   TIMESTAMP(3) NOT NULL,
    "villageId"    TEXT NOT NULL,

    CONSTRAINT "RecruitQueue_pkey" PRIMARY KEY ("id")
);

-- Index for fast lookup by village + buildingType
CREATE INDEX "RecruitQueue_villageId_buildingType_idx" ON "RecruitQueue"("villageId", "buildingType");

-- Foreign key
ALTER TABLE "RecruitQueue" ADD CONSTRAINT "RecruitQueue_villageId_fkey"
    FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;
