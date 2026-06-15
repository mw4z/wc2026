import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshLiveScores } from "@/lib/resultSync";

// Live (in-play) scores for the match cards. Public — scores aren't sensitive.
// Reads the DB (cheap) and only hits the provider when the data is stale (~45s),
// so any number of polling clients cost at most ~1 provider request per window.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVE_WINDOW_MS = 4 * 3600_000;
// Refresh from ESPN when our newest live data is older than this. Kept short so
// scores feel real-time; still at most ~1 ESPN request per window no matter how
// many clients poll (shared in-flight promise + this staleness gate).
const STALE_MS = 20_000;

export async function GET() {
  const now = new Date();
  const nowMs = now.getTime();

  const candidates = await prisma.match.findMany({
    where: { status: { notIn: ["SCORED"] }, homeScore: null, kickoffAt: { lte: now } },
    select: {
      id: true,
      liveHomeScore: true,
      liveAwayScore: true,
      externalStatus: true,
      lastSyncedAt: true,
      kickoffAt: true,
    },
  });
  const inPlay = candidates.filter((m) => nowMs - m.kickoffAt.getTime() <= LIVE_WINDOW_MS);
  if (inPlay.length === 0) return NextResponse.json({ matches: [] });

  // Goal scorers for these matches (Latin names; the client localizes to Arabic).
  const goalRows = await prisma.matchGoal.findMany({
    where: { matchId: { in: inPlay.map((m) => m.id) } },
    orderBy: { sortOrder: "asc" },
    select: { matchId: true, side: true, player: true, minute: true, note: true },
  });
  const goalsByMatch = new Map<string, { side: string; player: string; minute: string; note: string | null }[]>();
  for (const g of goalRows) {
    const list = goalsByMatch.get(g.matchId) ?? [];
    list.push({ side: g.side, player: g.player, minute: g.minute, note: g.note });
    goalsByMatch.set(g.matchId, list);
  }
  const goalsFor = (id: string) => goalsByMatch.get(id) ?? [];

  // Refresh from the provider only if our newest live data is stale.
  const freshest = Math.max(0, ...inPlay.map((m) => m.lastSyncedAt?.getTime() ?? 0));
  if (nowMs - freshest > STALE_MS) {
    try {
      const refreshed = await refreshLiveScores();
      const byId = new Map(refreshed.map((r) => [r.matchId, r]));
      const matches = inPlay.map((m) => {
        const r = byId.get(m.id);
        return r
          ? { id: m.id, home: r.home, away: r.away, status: r.status, final: r.final, goals: goalsFor(m.id) }
          : { id: m.id, home: m.liveHomeScore, away: m.liveAwayScore, status: m.externalStatus, final: false, goals: goalsFor(m.id) };
      });
      return NextResponse.json({ matches });
    } catch {
      // Fall through to DB values on any provider/refresh error.
    }
  }

  const matches = inPlay.map((m) => ({
    id: m.id,
    home: m.liveHomeScore,
    away: m.liveAwayScore,
    status: m.externalStatus,
    final: false,
    goals: goalsFor(m.id),
  }));
  return NextResponse.json({ matches });
}
