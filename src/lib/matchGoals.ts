import { prisma } from "./prisma";
import { lookupArabic } from "./playerNameResolver";

// Goal scorers for display, with the Arabic name resolved from cache (no network).
// Used to render scorers on FINISHED match cards / detail pages (the live endpoint
// covers in-play matches separately).
export interface SerializedGoal {
  side: string; // "home" | "away" (our orientation)
  player: string; // Latin name (fallback)
  playerAr: string | null; // auto-resolved Arabic name when cached
  minute: string;
  note: string | null; // "Penalty" | "Own Goal" | null
}

/** Goals grouped by matchId for the given matches (Arabic resolved cache-only). */
export async function getSerializedGoals(matchIds: string[]): Promise<Map<string, SerializedGoal[]>> {
  const out = new Map<string, SerializedGoal[]>();
  if (matchIds.length === 0) return out;
  const rows = await prisma.matchGoal.findMany({
    where: { matchId: { in: matchIds } },
    orderBy: { sortOrder: "asc" },
    select: { matchId: true, side: true, player: true, minute: true, note: true },
  });
  for (const g of rows) {
    const ar = await lookupArabic(g.player); // string | null | undefined (cache only)
    const list = out.get(g.matchId) ?? [];
    list.push({ side: g.side, player: g.player, playerAr: ar ?? null, minute: g.minute, note: g.note });
    out.set(g.matchId, list);
  }
  return out;
}
