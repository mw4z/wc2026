import { prisma } from "./prisma";
import { getMovements } from "./rankMovement";

/**
 * Rebuild the denormalized LeaderboardEntry table from scored predictions.
 * Called after any scoring change. O(users + predictions); fine for an internal
 * event (hundreds of users, ~104 matches).
 *
 * Tie-breakers (applied in order):
 *   1. totalPoints (desc)
 *   2. exactScores (desc)
 *   3. correctOutcomes (desc)
 *   4. lastPredictionAt (asc — earlier submission wins)
 */
export async function recalculateLeaderboard() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, department: true },
  });

  const predictions = await prisma.prediction.findMany({
    select: {
      userId: true,
      pointsAwarded: true,
      isExactScore: true,
      isCorrectOutcome: true,
      isCorrectQualifier: true,
      submittedAt: true,
    },
  });

  type Agg = {
    totalPoints: number;
    exactScores: number;
    correctOutcomes: number;
    correctQualifiers: number;
    totalPredictions: number;
    scoredPredictions: number;
    lastPredictionAt: Date | null;
  };

  const agg = new Map<string, Agg>();
  for (const u of users) {
    agg.set(u.id, {
      totalPoints: 0,
      exactScores: 0,
      correctOutcomes: 0,
      correctQualifiers: 0,
      totalPredictions: 0,
      scoredPredictions: 0,
      lastPredictionAt: null,
    });
  }

  for (const p of predictions) {
    const a = agg.get(p.userId);
    if (!a) continue; // orphan prediction (user deleted) — skip
    a.totalPredictions += 1;
    if (!a.lastPredictionAt || p.submittedAt > a.lastPredictionAt) {
      a.lastPredictionAt = p.submittedAt;
    }
    if (p.pointsAwarded != null) {
      a.scoredPredictions += 1;
      a.totalPoints += p.pointsAwarded;
      if (p.isExactScore) a.exactScores += 1;
      if (p.isCorrectOutcome) a.correctOutcomes += 1;
      if (p.isCorrectQualifier) a.correctQualifiers += 1;
    }
  }

  const rows = users.map((u) => {
    const a = agg.get(u.id)!;
    return {
      userId: u.id,
      name: u.name,
      department: u.department,
      ...a,
      accuracy: a.scoredPredictions === 0 ? 0 : a.exactScores / a.scoredPredictions,
    };
  });

  rows.sort(
    (x, y) =>
      y.totalPoints - x.totalPoints ||
      y.exactScores - x.exactScores ||
      y.correctOutcomes - x.correctOutcomes ||
      lastPredCompare(x.lastPredictionAt, y.lastPredictionAt),
  );

  // Persist: clear and rewrite (simplest reliable approach at this scale).
  await prisma.$transaction([
    prisma.leaderboardEntry.deleteMany({}),
    prisma.leaderboardEntry.createMany({
      data: rows.map((r, i) => ({
        userId: r.userId,
        name: r.name,
        department: r.department,
        totalPoints: r.totalPoints,
        exactScores: r.exactScores,
        correctOutcomes: r.correctOutcomes,
        correctQualifiers: r.correctQualifiers,
        totalPredictions: r.totalPredictions,
        scoredPredictions: r.scoredPredictions,
        accuracy: r.accuracy,
        lastPredictionAt: r.lastPredictionAt,
        rank: i + 1,
      })),
    }),
  ]);

  return rows.length;
}

// Earlier submission wins; users with no predictions sort last.
function lastPredCompare(a: Date | null, b: Date | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.getTime() - b.getTime();
}

/**
 * The overall leaderboard, built LIVE over EVERY active user merged with their
 * denormalized stats (zeros for users with no scored predictions yet). This is
 * the source of truth for display: the LeaderboardEntry snapshot is only rebuilt
 * when a match is scored, so reading it directly would drop users who registered
 * since the last rebuild (the "missing users" bug). Same tie-breakers as the
 * snapshot. O(users + entries) — fine at event scale.
 */
export async function getLeaderboard() {
  const [users, entries, movements] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true },
    }),
    prisma.leaderboardEntry.findMany(),
    getMovements("overall"),
  ]);
  const byUser = new Map(entries.map((e) => [e.userId, e]));

  const rows = users.map((u) => {
    const e = byUser.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      department: u.department,
      totalPoints: e?.totalPoints ?? 0,
      exactScores: e?.exactScores ?? 0,
      correctOutcomes: e?.correctOutcomes ?? 0,
      correctQualifiers: e?.correctQualifiers ?? 0,
      totalPredictions: e?.totalPredictions ?? 0,
      scoredPredictions: e?.scoredPredictions ?? 0,
      accuracy: e?.accuracy ?? 0,
      lastPredictionAt: e?.lastPredictionAt ?? null,
    };
  });

  rows.sort(
    (x, y) =>
      y.totalPoints - x.totalPoints ||
      y.exactScores - x.exactScores ||
      y.correctOutcomes - x.correctOutcomes ||
      lastPredCompare(x.lastPredictionAt, y.lastPredictionAt),
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1, movement: movements.get(r.userId)?.movement ?? null }));
}
