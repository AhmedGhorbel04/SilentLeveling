-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CLAIM_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CLAIM_REJECTED';

-- AlterTable
ALTER TABLE "xp_transactions" ADD COLUMN     "claim_id" UUID;

-- CreateTable
CREATE TABLE "legendary_quests" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "title" JSONB NOT NULL,
    "category" "Category" NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "xp_reward" INTEGER NOT NULL,
    "title_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "legendary_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_claims" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "legendary_quest_id" UUID,
    "title" VARCHAR(120),
    "description" VARCHAR(2000) NOT NULL,
    "proof_url" VARCHAR(500) NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "tier_awarded" "AchievementTier",
    "xp_awarded" INTEGER,
    "title_awarded_id" UUID,
    "reviewer_id" UUID,
    "review_note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "achievement_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legendary_quests_key_key" ON "legendary_quests"("key");

-- CreateIndex
CREATE INDEX "achievement_claims_status_created_at_idx" ON "achievement_claims"("status", "created_at");

-- CreateIndex
CREATE INDEX "achievement_claims_user_id_status_idx" ON "achievement_claims"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_claim_id_key" ON "xp_transactions"("claim_id");

-- AddForeignKey
ALTER TABLE "legendary_quests" ADD CONSTRAINT "legendary_quests_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_claims" ADD CONSTRAINT "achievement_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_claims" ADD CONSTRAINT "achievement_claims_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_claims" ADD CONSTRAINT "achievement_claims_legendary_quest_id_fkey" FOREIGN KEY ("legendary_quest_id") REFERENCES "legendary_quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_claims" ADD CONSTRAINT "achievement_claims_title_awarded_id_fkey" FOREIGN KEY ("title_awarded_id") REFERENCES "titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "achievement_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Added by hand
ALTER TABLE "legendary_quests" ADD CONSTRAINT "legendary_quests_xp_positive" CHECK ("xp_reward" > 0);
ALTER TABLE "achievement_claims"
  ADD CONSTRAINT "achievement_claims_review_consistent"
    CHECK (("status" = 'PENDING') = ("reviewed_at" IS NULL)),
  ADD CONSTRAINT "achievement_claims_approval_complete"
    CHECK ("status" <> 'APPROVED' OR ("tier_awarded" IS NOT NULL AND "xp_awarded" > 0));
