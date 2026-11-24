-- CreateEnum
CREATE TYPE "Category" AS ENUM ('FITNESS', 'STUDIES', 'LANGUAGES', 'READING', 'CAREER', 'HEALTH');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'NORMAL', 'HARD', 'EXTREME');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('DAILY', 'WEEKLY', 'PENALTY', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "QuestSource" AS ENUM ('SYSTEM', 'CUSTOM', 'PENALTY');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('DAILY', 'WEEKLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'REPLACED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "daily_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "last_rollover_date" DATE,
ADD COLUMN     "rerolls_date" DATE,
ADD COLUMN     "rerolls_used" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "xp_transactions" ADD COLUMN     "quest_id" UUID;

-- CreateTable
CREATE TABLE "focus_areas" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "Category" NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "focus_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "category" "Category" NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "type" "TemplateType" NOT NULL,
    "title" JSONB NOT NULL,
    "minutes" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "quest_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "source" "QuestSource" NOT NULL,
    "type" "QuestType" NOT NULL,
    "title" VARCHAR(120),
    "description" VARCHAR(1000),
    "category" "Category" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "minutes" INTEGER,
    "xp_reward" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "quest_date" DATE NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "xp_awarded" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "quests_total" INTEGER NOT NULL,
    "quests_completed" INTEGER NOT NULL,
    "all_completed" BOOLEAN NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("user_id","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "focus_areas_user_id_category_key" ON "focus_areas"("user_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "quest_templates_key_key" ON "quest_templates"("key");

-- CreateIndex
CREATE INDEX "quest_templates_type_category_level_idx" ON "quest_templates"("type", "category", "level");

-- CreateIndex
CREATE INDEX "quests_user_id_quest_date_idx" ON "quests"("user_id", "quest_date");

-- CreateIndex
CREATE INDEX "quests_user_id_status_idx" ON "quests"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_quest_id_key" ON "xp_transactions"("quest_id");

-- AddForeignKey
ALTER TABLE "focus_areas" ADD CONSTRAINT "focus_areas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "quest_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Added by hand (Prisma cannot express these in schema.prisma)
-- ---------------------------------------------------------------------------

ALTER TABLE "users"
  ADD CONSTRAINT "users_daily_minutes_allowed" CHECK ("daily_minutes" IN (15, 30, 60, 120, 240)),
  ADD CONSTRAINT "users_rerolls_non_negative" CHECK ("rerolls_used" >= 0);

ALTER TABLE "quest_templates"
  ADD CONSTRAINT "quest_templates_minutes_range" CHECK ("minutes" BETWEEN 5 AND 240);

ALTER TABLE "quests"
  ADD CONSTRAINT "quests_minutes_range" CHECK ("minutes" IS NULL OR "minutes" BETWEEN 5 AND 240),
  ADD CONSTRAINT "quests_xp_reward_positive" CHECK ("xp_reward" > 0),
  -- A completed quest always has a completion time, and only completed quests have one
  ADD CONSTRAINT "quests_completed_at_consistent"
    CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL));

ALTER TABLE "focus_areas"
  ADD CONSTRAINT "focus_areas_completed_count_non_negative" CHECK ("completed_count" >= 0);

ALTER TABLE "daily_logs"
  ADD CONSTRAINT "daily_logs_counts_valid"
    CHECK ("quests_completed" >= 0 AND "quests_completed" <= "quests_total");
