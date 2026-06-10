-- Phase: Auto Results Sync.
-- Adds provider-mapping + sync-metadata columns to Match. Manual admin result
-- entry is unchanged; these columns are metadata only and never alter scoring.
-- Paste into the Supabase SQL Editor (this project migrates via the SQL editor).
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

BEGIN;

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "externalProvider"  TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "externalFixtureId" TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "resultSource"      TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "lastSyncedAt"      TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "externalStatus"    TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "needsReview"       BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Match_externalFixtureId_idx" ON "Match"("externalFixtureId");

COMMIT;
