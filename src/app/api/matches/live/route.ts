import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshLiveScores } from "@/lib/resultSync";

// Live (in-play) scores for the match cards. Public — scores aren't sensitive.
// Reads the DB (cheap) and only hits the provider when the data is stale (~45s),
// so any number of polling clients cost at most ~1 provider request per window.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVE_WINDOW_MS = 4 * 3600_000;
const STALE_MS = 45_000;

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

  // Refresh from the provider only if our newest live data is stale.
  const freshest = Math.max(0, ...inPlay.map((m) => m.lastSyncedAt?.getTime() ?? 0));
  if (nowMs - freshest > STALE_MS) {
    try {
      const refreshed = await refreshLiveScores();
      const byId = new Map(refreshed.map((r) => [r.matchId, r]));
      const matches = inPlay.map((m) => {
        const r = byId.get(m.id);
        return r
          ? { id: m.id, home: r.home, away: r.away, status: r.status, final: r.final }
          : { id: m.id, home: m.liveHomeScore, away: m.liveAwayScore, status: m.externalStatus, final: false };
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
  }));
  return NextResponse.json({ matches });
}
