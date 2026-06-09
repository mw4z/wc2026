-- Per-event reminder dedupe: a PushReminder is now unique per (user, match, kind)
-- so the three notification types (open / closing / scored) each fire once.
-- Existing rows were "closing" reminders → default keeps them valid.
BEGIN;

ALTER TABLE "PushReminder" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'closing';

ALTER TABLE "PushReminder" DROP CONSTRAINT IF EXISTS "PushReminder_userId_matchId_key";
DROP INDEX IF EXISTS "PushReminder_userId_matchId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "PushReminder_userId_matchId_kind_key"
  ON "PushReminder" ("userId", "matchId", "kind");

COMMIT;
