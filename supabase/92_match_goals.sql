-- Live goal scorers + per-goal push notifications.
--   MatchGoal  : one row per goal (player, minute, side), deduped per match.
--   Match.liveStartedAt : first time the live sync saw the match in play (so we
--                         can seed already-played goals silently, no push burst).
--   User.notifyGoals / notifyGoalsScope : per-user control of goal push alerts.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS "MatchGoal" (
  "id"        TEXT NOT NULL,
  "matchId"   TEXT NOT NULL,
  "side"      TEXT NOT NULL,
  "player"    TEXT NOT NULL,
  "minute"    TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "note"      TEXT,
  "notified"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchGoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MatchGoal_matchId_fkey" FOREIGN KEY ("matchId")
    REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatchGoal_matchId_side_player_minute_key"
  ON "MatchGoal" ("matchId", "side", "player", "minute");
CREATE INDEX IF NOT EXISTS "MatchGoal_matchId_idx" ON "MatchGoal" ("matchId");

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "liveStartedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyGoals" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyGoalsScope" TEXT NOT NULL DEFAULT 'ALL';
