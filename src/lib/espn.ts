// Sole results source: ESPN's free public scoreboard API (no key required).
// Drives BOTH the live in-play score and the official final result + scoring.
// Endpoint: site.api.espn.com — public JSON, returns pre / in / post per event.

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export interface EspnEvent {
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  state: "pre" | "in" | "post";
  completed: boolean;
  dateISO: string;
  detail: string; // e.g. "45'", "HT", "FT", "FT (Pens)"
  homeWinner: boolean; // ESPN's advancing-team flag (covers penalties)
  awayWinner: boolean;
  penalties: boolean; // a shootout was involved
}

function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

interface RawCompetitor {
  homeAway?: string;
  score?: string;
  winner?: boolean;
  shootoutScore?: number | string;
  team?: { displayName?: string; name?: string; location?: string };
}
interface RawEvent {
  date?: string;
  status?: { type?: { state?: string; completed?: boolean; shortDetail?: string } };
  competitions?: { competitors?: RawCompetitor[] }[];
}

/**
 * Fetch ESPN World Cup events for the last `daysBack` days through today (UTC).
 * Live needs only ~1 day; the results cron uses a few days to catch recently
 * finished matches that aren't scored yet.
 */
export async function fetchEspnEvents(daysBack = 1): Promise<EspnEvent[]> {
  const now = new Date();
  const dates: string[] = [];
  for (let i = daysBack; i >= 0; i--) dates.push(yyyymmdd(new Date(now.getTime() - i * 24 * 3600_000)));

  const out: EspnEvent[] = [];
  const seen = new Set<string>();
  for (const d of dates) {
    let json: { events?: RawEvent[] };
    try {
      const res = await fetch(`${ESPN}?dates=${d}`, { cache: "no-store" });
      if (!res.ok) continue;
      json = (await res.json()) as { events?: RawEvent[] };
    } catch {
      continue;
    }
    for (const e of json.events ?? []) {
      const cs = e.competitions?.[0]?.competitors ?? [];
      const home = cs.find((c) => c.homeAway === "home");
      const away = cs.find((c) => c.homeAway === "away");
      const homeName = home?.team?.displayName || home?.team?.name || home?.team?.location || "";
      const awayName = away?.team?.displayName || away?.team?.name || away?.team?.location || "";
      if (!homeName || !awayName) continue;
      const key = `${homeName}|${awayName}|${e.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const num = (s?: string) => (s != null && s !== "" ? Number(s) : null);
      out.push({
        homeName,
        awayName,
        homeScore: num(home?.score),
        awayScore: num(away?.score),
        state: (e.status?.type?.state as EspnEvent["state"]) ?? "pre",
        completed: !!e.status?.type?.completed,
        dateISO: e.date ?? "",
        detail: e.status?.type?.shortDetail ?? "",
        homeWinner: home?.winner === true,
        awayWinner: away?.winner === true,
        penalties: home?.shootoutScore != null || away?.shootoutScore != null,
      });
    }
  }
  return out;
}

/** Live (in-play) subset — today ± a day. */
export async function fetchEspnLive(): Promise<EspnEvent[]> {
  return fetchEspnEvents(1);
}
