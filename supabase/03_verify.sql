-- Run in Supabase SQL Editor to confirm DB state.

-- A) After schema + seed: expect 8 tables.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- B) Seed row counts: Team=49 (48+TBD), User>=1, Setting=1, Match=11 (10 sample +1 lock-test).
SELECT
  (SELECT count(*) FROM "Team")    AS teams,
  (SELECT count(*) FROM "User")    AS users,
  (SELECT count(*) FROM "Setting") AS settings,
  (SELECT count(*) FROM "Match")   AS matches;

-- C) Bootstrap admin + default setting present.
SELECT "employeeId","name","role","isActive" FROM "User" WHERE "employeeId" = '1001';
SELECT * FROM "Setting";

-- D) AFTER running the E2E test — evidence of the flows:
-- The created test user (most recent):
SELECT id,"employeeId","name","department","createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 3;
-- Their prediction + score (mtch_1 should be 2-1, pointsAwarded=3, isExactScore=true):
SELECT p."predictedHomeScore", p."predictedAwayScore", p."pointsAwarded", p."isExactScore", p."isCorrectOutcome"
FROM "Prediction" p JOIN "Match" m ON m.id = p."matchId" WHERE m."matchNumber" = 1;
-- Audit trail (one CREATE per prediction write):
SELECT action, "createdAt" FROM "PredictionAuditLog" ORDER BY "createdAt" DESC LIMIT 5;
-- Admin result audit (CREATE result + SCORE):
SELECT action, "createdAt" FROM "MatchResultAuditLog" ORDER BY "createdAt" DESC LIMIT 5;
-- Leaderboard rebuilt (top by rank):
SELECT rank, name, "totalPoints", "exactScores", "correctOutcomes" FROM "LeaderboardEntry" ORDER BY rank LIMIT 5;

-- E) CLEANUP after testing — remove the lock-test fixture match:
-- DELETE FROM "Match" WHERE "matchNumber" = 101;
