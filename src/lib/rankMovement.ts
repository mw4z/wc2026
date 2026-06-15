import { prisma } from "./prisma";
import { getGroupLeaderboard } from "./groups";
import { getLeaderboard, rankOverallExcluding } from "./leaderboard";

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
  // Overall — use the SAME ranking the board displays (active users, live order),
  // so `rank` here lines up exactly with what users see (no population mismatch).
  const overall = (await getLeaderboard()).map((r) => ({ userId: r.userId, rank: r.rank }));
  await rotateScope("overall", overall);

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

/**
 * One-time backfill: seed the arrows from the LAST match already played, so
 * movement shows immediately without waiting for the next match. For each board
 * we set rank = current standing and previousRank = the standing computed with
 * that last match's points removed (i.e. how everyone moved because of it).
 * Idempotent — safe to run repeatedly; always reflects the latest scored match.
 */
export async function backfillLastMatchMovement(): Promise<{ matchId: string | null; moved: number }> {
  const last = await prisma.match.findFirst({
    where: { status: "SCORED" },
    orderBy: [{ resultConfirmedAt: "desc" }, { kickoffAt: "desc" }],
    select: { id: true },
  });
  if (!last) return { matchId: null, moved: 0 };

  // Overall — current = the displayed ranking; previous = recompute minus this
  // match. Both active-users-only so the two sides use identical methodology.
  const currentOverall = (await getLeaderboard()).map((r) => ({ userId: r.userId, rank: r.rank }));
  const prevOverall = await rankOverallExcluding(last.id);
  await writeSnapshot("overall", currentOverall, prevOverall);
  // How many people actually changed overall position because of this match.
  const moved = currentOverall.filter((r) => {
    const p = prevOverall.get(r.userId);
    return p != null && p !== r.rank;
  }).length;

  // Each active group's board, same two-pass approach with its custom scoring.
  const groups = await prisma.group.findMany({ where: { isActive: true }, select: { id: true } });
  for (const g of groups) {
    const current = await getGroupLeaderboard(g.id);
    const previous = await getGroupLeaderboard(g.id, { excludeMatchId: last.id });
    const prevMap = new Map(previous.map((r) => [r.userId, r.rank]));
    await writeSnapshot(`group:${g.id}`, current.map((r) => ({ userId: r.userId, rank: r.rank })), prevMap);
  }
  return { matchId: last.id, moved };
}

/** Write a scope's snapshot with an explicit previous-rank map (used by backfill). */
async function writeSnapshot(scope: string, ranking: { userId: string; rank: number }[], prev: Map<string, number>): Promise<void> {
  await prisma.$transaction([
    prisma.rankSnapshot.deleteMany({ where: { scope } }),
    prisma.rankSnapshot.createMany({
      data: ranking.map((r) => ({ scope, userId: r.userId, rank: r.rank, previousRank: prev.get(r.userId) ?? null })),
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
