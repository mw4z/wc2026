-- Per-group custom scoring (leader-customizable point values + winner-only mode)
-- and per-match overrides. The GLOBAL leaderboard is unaffected; these only
-- change how a group's own leaderboard is computed (live, from stored flags).

ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "pointsExact"     INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "pointsOutcome"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "pointsQualifier" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "winnerOnly"      BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "GroupMatchRule" (
  "id"              TEXT NOT NULL,
  "groupId"         TEXT NOT NULL,
  "matchId"         TEXT NOT NULL,
  "pointsExact"     INTEGER,
  "pointsOutcome"   INTEGER,
  "pointsQualifier" INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupMatchRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GroupMatchRule_groupId_fkey" FOREIGN KEY ("groupId")
    REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupMatchRule_matchId_fkey" FOREIGN KEY ("matchId")
    REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GroupMatchRule_groupId_matchId_key"
  ON "GroupMatchRule"("groupId", "matchId");
CREATE INDEX IF NOT EXISTS "GroupMatchRule_groupId_idx"
  ON "GroupMatchRule"("groupId");
