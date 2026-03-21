-- ─────────────────────────────────────────────────────────────
-- Migration Phase 1 — Additive uniquement
-- Suppose que GameWorld, PlayerWorld et le Village.worldId
-- existent déjà (migration 20260320100000_add_game_worlds).
-- ─────────────────────────────────────────────────────────────

-- 1. Nouveaux champs sur Village
ALTER TABLE "Village"
  ADD COLUMN IF NOT EXISTS "wallLevel"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "farmLevel"       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "stableLevel"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rallyPointLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loyaltyPoints"   INTEGER NOT NULL DEFAULT 100;

-- 2. Nouveaux champs sur Player
ALTER TABLE "Player"
  ADD COLUMN IF NOT EXISTS "attackPoints"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "defensePoints" INTEGER NOT NULL DEFAULT 0;

-- 3. Nouveaux champs sur AttackReport (morale + wallBonus)
ALTER TABLE "AttackReport"
  ADD COLUMN IF NOT EXISTS "morale"    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "wallBonus" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- 4. Nouvelle table BuildingQueueItem (multi-slots)
CREATE TABLE IF NOT EXISTS "BuildingQueueItem" (
    "id"          TEXT             NOT NULL,
    "buildingId"  TEXT             NOT NULL,
    "targetLevel" INTEGER          NOT NULL,
    "position"    INTEGER          NOT NULL DEFAULT 0,
    "startsAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt"      TIMESTAMP(3)     NOT NULL,
    "villageId"   TEXT             NOT NULL,
    CONSTRAINT "BuildingQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BuildingQueueItem_villageId_position_idx"
    ON "BuildingQueueItem"("villageId", "position");

ALTER TABLE "BuildingQueueItem"
    ADD CONSTRAINT "BuildingQueueItem_villageId_fkey"
    FOREIGN KEY ("villageId")
    REFERENCES "Village"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Migrer les données existantes de BuildingQueue → BuildingQueueItem
--    (les jobs BullMQ actifs continueront à fonctionner via le legacy worker)
INSERT INTO "BuildingQueueItem" ("id", "buildingId", "targetLevel", "position", "startsAt", "endsAt", "villageId")
SELECT
    gen_random_uuid()::text,
    "buildingId",
    "targetLevel",
    0,
    "startsAt",
    "endsAt",
    "villageId"
FROM "BuildingQueue"
ON CONFLICT DO NOTHING;

-- Note : ne pas supprimer BuildingQueue ici.
-- Attendre que les jobs BullMQ existants soient terminés,
-- puis exécuter manuellement : DROP TABLE "BuildingQueue";
