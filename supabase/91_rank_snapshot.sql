-- Rank movement snapshots. After each match is scored the app rotates a per-board
-- snapshot of every user's rank so the leaderboards can show a green up / red down
-- arrow versus the standing before that match.
--   scope        = 'overall' or 'group:<groupId>'
--   rank         = the user's rank as of the latest scoring round
--   previousRank = their rank one scoring round earlier (NULL on first appearance)
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS "RankSnapshot" (
  "scope"        TEXT        NOT NULL,
  "userId"       TEXT        NOT NULL,
  "rank"         INTEGER     NOT NULL,
  "previousRank" INTEGER,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("scope", "userId")
);

CREATE INDEX IF NOT EXISTS "RankSnapshot_scope_idx" ON "RankSnapshot" ("scope");
