import { prisma } from "./prisma";
import { getGroupLeaderboard } from "./groups";
import { getLeaderboard, rankOverallExcluding } from "./leaderboard";

// Rank movement (green ▲ / red ▼ on the leaderboards). After EVERY match is scored
// we snapshot how each member moved BECAUSE OF that match: for each board we store
//   rank         = the current standing (with the match counted)
//   previousRank = the standing computed with THAT match's points removed
// movement shown = previousRank - rank   (> 0 climbed, < 0 dropped, 0/null none).
//
// Computing "previous" by excluding the just-scored match (rather than diffing
// against an earlier saved snapshot) means the arrows always reflect exactly that
// one match — never distorted by users registering or any bookkeeping in between —
// and they work on the very first scored match with no baseline needed.

export interface RankMovement {
  rank: number;
  previousRank: number | null;
  movement: number | null; // previousRank - rank; null when there's no prior standing
}

/**
 * Snapshot movement caused by ONE specific match across the overall board and
 * every active group board. Called automatically right after the match is scored
 * (see matches.ts). Returns how many people changed overall position.
 */
export async function snapshotMovementForMatch(matchId: string): Promise<{ moved: number }> {
  // Overall — current = the displayed ranking; previous = recompute minus this
  // match. Both active-users-only so the two sides use identical methodology.
  const currentOverall = (await getLeaderboard()).map((r) => ({ userId: r.userId, rank: r.rank }));
  const prevOverall = await rankOverallExcluding(matchId);
  await writeSnapshot("overall", currentOverall, prevOverall);
  const moved = currentOverall.filter((r) => {
    const p = prevOverall.get(r.userId);
    return p != null && p !== r.rank;
  }).length;

  // Every group's board (incl. inactive — members may still view them), same
  // two-pass approach with each group's custom scoring.
  const groups = await prisma.group.findMany({ select: { id: true } });
  for (const g of groups) {
    const current = await getGroupLeaderboard(g.id);
    const previous = await getGroupLeaderboard(g.id, { excludeMatchId: matchId });
    const prevMap = new Map(previous.map((r) => [r.userId, r.rank]));
    await writeSnapshot(`group:${g.id}`, current.map((r) => ({ userId: r.userId, rank: r.rank })), prevMap);
  }
  return { moved };
}

/**
 * Backfill the arrows from the LAST match already played — for boards that were
 * scored before this feature existed, or to re-seed on demand (admin Recalculate).
 * Idempotent; always reflects the most recently scored match.
 */
export async function backfillLastMatchMovement(): Promise<{ matchId: string | null; moved: number }> {
  const last = await prisma.match.findFirst({
    where: { status: "SCORED" },
    orderBy: [{ resultConfirmedAt: "desc" }, { kickoffAt: "desc" }],
    select: { id: true },
  });
  if (!last) return { matchId: null, moved: 0 };
  const { moved } = await snapshotMovementForMatch(last.id);
  return { matchId: last.id, moved };
}

/** Write a scope's snapshot with an explicit previous-rank map. */
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
