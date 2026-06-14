-- Live (in-play) running score, mirrored from the football provider while a
-- match is being played. Shown on the match card; distinct from the FINAL
-- homeScore/awayScore (which are only set once the match is officially over).
-- Safe to re-run.
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "liveHomeScore" INTEGER;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "liveAwayScore" INTEGER;
