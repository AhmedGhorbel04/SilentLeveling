-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('QUEST', 'CLAIM', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TitleRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_title_id" UUID,
ADD COLUMN     "best_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rank" VARCHAR(4) NOT NULL DEFAULT 'E4',
ADD COLUMN     "streak_before_penalty" INTEGER,
ADD COLUMN     "total_xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "player_stats" (
    "user_id" UUID NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 0,
    "intelligence" INTEGER NOT NULL DEFAULT 0,
    "discipline" INTEGER NOT NULL DEFAULT 0,
    "consistency" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "XpReason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" JSONB NOT NULL,
    "rarity" "TitleRarity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_titles" (
    "user_id" UUID NOT NULL,
    "title_id" UUID NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_titles_pkey" PRIMARY KEY ("user_id","title_id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "code" VARCHAR(32) NOT NULL,
    "title_id" UUID,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "user_id" UUID NOT NULL,
    "achievement_code" VARCHAR(32) NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id","achievement_code")
);

-- CreateIndex
CREATE INDEX "xp_transactions_user_id_created_at_idx" ON "xp_transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "titles_key_key" ON "titles"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_title_id_fkey" FOREIGN KEY ("active_title_id") REFERENCES "titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_code_fkey" FOREIGN KEY ("achievement_code") REFERENCES "achievements"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Added by hand (Prisma cannot express these in schema.prisma)
-- ---------------------------------------------------------------------------

-- Players who registered before this migration get their stats row
INSERT INTO "player_stats" ("user_id") SELECT "id" FROM "users";

-- Last line of defence against bugs: the database itself refuses impossible values
ALTER TABLE "users"
  ADD CONSTRAINT "users_total_xp_non_negative" CHECK ("total_xp" >= 0),
  ADD CONSTRAINT "users_level_positive" CHECK ("level" >= 1),
  ADD CONSTRAINT "users_streaks_non_negative" CHECK ("current_streak" >= 0 AND "best_streak" >= 0);

ALTER TABLE "player_stats"
  ADD CONSTRAINT "player_stats_non_negative"
  CHECK ("strength" >= 0 AND "intelligence" >= 0 AND "discipline" >= 0 AND "consistency" >= 0);

-- XP gains are positive; an admin correction may be negative but never zero
ALTER TABLE "xp_transactions"
  ADD CONSTRAINT "xp_transactions_amount_not_zero" CHECK ("amount" <> 0);
