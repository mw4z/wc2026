import { prisma } from "./prisma";
import { getGroupLeaderboard } from "./groups";

// Rank movement (green ▲ / red ▼ on the leaderboards). After each match is scored
// we rotate a snapshot of every user's rank per board, so the read side can show
// how each member moved relative to the standing BEFORE that match.
//
// Rotation semantics: each snapshot row keeps `rank` (latest round) and
// `previousRank` (the round before). movement = previousRank - rank
//   > 0 climbed, < 0 dropped, 0/null no change.
// We only rotate on real scoring (see matches.ts) — never on user deletion or a
// manual rebuild — so the arrows always reflect "after the last match", not
// bookkeeping churn.

export interface RankMovement {
  rank: number;
  previousRank: number | null;
  movement: number | null; // previousRank - rank; null when there's no prior standing
}

/** Snapshot overall + every active group board. Call AFTER recalculateLeaderboard. */
export async function snapshotAllRanks(): Promise<void> {
  // Overall — read the freshly written ranks straight from LeaderboardEntry.
  const entries = await prisma.leaderboardEntry.findMany({ select: { userId: true, rank: true } });
  await rotateScope("overall", entries);

  // Each active group's live board.
  const groups = await prisma.group.findMany({ where: { isActive: true }, select: { id: true } });
  for (const g of groups) {
    const board = await getGroupLeaderboard(g.id);
    await rotateScope(`group:${g.id}`, board.map((r) => ({ userId: r.userId, rank: r.rank })));
  }
}

async function rotateScope(scope: string, ranking: { userId: string; rank: number }[]): Promise<void> {
  const existing = await prisma.rankSnapshot.findMany({ where: { scope }, select: { userId: true, rank: true } });
  const prior = new Map(existing.map((e) => [e.userId, e.rank]));
  await prisma.$transaction([
    prisma.rankSnapshot.deleteMany({ where: { scope } }),
    prisma.rankSnapshot.createMany({
      data: ranking.map((r) => ({
        scope,
        userId: r.userId,
        rank: r.rank,
        previousRank: prior.get(r.userId) ?? null,
      })),
    }),
  ]);
}

/** Movement map for a scope, keyed by userId. Empty map if nothing snapshotted yet. */
export async function getMovements(scope: string): Promise<Map<string, RankMovement>> {
  const rows = await prisma.rankSnapshot.findMany({
    where: { scope },
    select: { userId: true, rank: true, previousRank: true },
  });
  return new Map(
    rows.map((r) => [
      r.userId,
      { rank: r.rank, previousRank: r.previousRank, movement: r.previousRank == null ? null : r.previousRank - r.rank },
    ]),
  );
}
