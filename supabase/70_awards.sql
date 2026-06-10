-- Phase: Tournament awards (Golden Ball / Boot / Glove / Young Player).
-- Optional, leader-toggled, separate awards board (3 pts/correct). Does not touch
-- the match leaderboard. Paste into the Supabase SQL Editor. Idempotent-ish.

BEGIN;

-- Per-group toggle (predictions stay global; this controls visibility + board).
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "awardsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Award definitions.
CREATE TABLE IF NOT EXISTS "Award" (
    "id"                TEXT NOT NULL,
    "key"               TEXT NOT NULL,
    "nameAr"            TEXT NOT NULL,
    "nameEn"            TEXT NOT NULL,
    "sortOrder"         INTEGER NOT NULL DEFAULT 0,
    "isActive"          BOOLEAN NOT NULL DEFAULT true,
    "winnerCandidateId" TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Award_key_key" ON "Award"("key");

-- Curated candidates per award.
CREATE TABLE IF NOT EXISTS "AwardCandidate" (
    "id"        TEXT NOT NULL,
    "awardId"   TEXT NOT NULL,
    "nameAr"    TEXT NOT NULL,
    "nameEn"    TEXT NOT NULL,
    "team"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AwardCandidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AwardCandidate_awardId_idx" ON "AwardCandidate"("awardId");

-- One pick per user per award (global, like match predictions).
CREATE TABLE IF NOT EXISTS "AwardPrediction" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "awardId"       TEXT NOT NULL,
    "candidateId"   TEXT NOT NULL,
    "pointsAwarded" INTEGER,
    "isCorrect"     BOOLEAN NOT NULL DEFAULT false,
    "submittedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AwardPrediction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AwardPrediction_userId_awardId_key" ON "AwardPrediction"("userId", "awardId");
CREATE INDEX IF NOT EXISTS "AwardPrediction_awardId_idx" ON "AwardPrediction"("awardId");
CREATE INDEX IF NOT EXISTS "AwardPrediction_userId_idx" ON "AwardPrediction"("userId");

-- Foreign keys (added separately so re-runs don't fail if tables already exist).
DO $$ BEGIN
  ALTER TABLE "AwardCandidate" ADD CONSTRAINT "AwardCandidate_awardId_fkey"
    FOREIGN KEY ("awardId") REFERENCES "Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AwardPrediction" ADD CONSTRAINT "AwardPrediction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AwardPrediction" ADD CONSTRAINT "AwardPrediction_awardId_fkey"
    FOREIGN KEY ("awardId") REFERENCES "Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AwardPrediction" ADD CONSTRAINT "AwardPrediction_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "AwardCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the four v1 awards (candidates are added by the admin in the UI).
INSERT INTO "Award" ("id","key","nameAr","nameEn","sortOrder","updatedAt") VALUES
  ('awd_golden_ball',  'golden_ball',  'الكرة الذهبية (أفضل لاعب)',      'Golden Ball (Best Player)',       1, CURRENT_TIMESTAMP),
  ('awd_golden_boot',  'golden_boot',  'الحذاء الذهبي (الهداف)',         'Golden Boot (Top Scorer)',        2, CURRENT_TIMESTAMP),
  ('awd_golden_glove', 'golden_glove', 'القفاز الذهبي (أفضل حارس)',      'Golden Glove (Best Goalkeeper)',  3, CURRENT_TIMESTAMP),
  ('awd_best_young',   'best_young',   'أفضل لاعب شاب',                  'Best Young Player',               4, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
