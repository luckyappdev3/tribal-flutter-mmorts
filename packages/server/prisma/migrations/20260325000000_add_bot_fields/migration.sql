-- AlterTable Player: add botDifficulty and isBot
ALTER TABLE "Player" ADD COLUMN "botDifficulty" INTEGER;
ALTER TABLE "Player" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Village: add bot fields
ALTER TABLE "Village" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Village" ADD COLUMN "botDifficulty" INTEGER;
ALTER TABLE "Village" ADD COLUMN "botPlayerId" TEXT;
