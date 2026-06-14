// Free live-score source: ESPN's public scoreboard API (no key required).
// Used ONLY for the in-play live score/status on match cards. Official final
// results + scoring still go through the configured provider (football-data).
// Endpoint: site.api.espn.com — widely-used public JSON, returns pre/in/post.

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export interface EspnLive {
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  state: "pre" | "in" | "post";
  completed: boolean;
  dateISO: string;
  detail: string; // e.g. "45'", "HT", "FT"
}

function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; name?: string; location?: string };
}
interface EspnEvent {
  date?: string;
  status?: { type?: { state?: string; completed?: boolean; shortDetail?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

/** Fetch ESPN World Cup scoreboard for now ± a day (covers cross-midnight UTC). */
export async function fetchEspnLive(): Promise<EspnLive[]> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600_000);
  const dates = [yyyymmdd(yesterday), yyyymmdd(now)];

  const out: EspnLive[] = [];
  const seen = new Set<string>();
  for (const d of dates) {
    let json: { events?: EspnEvent[] };
    try {
      const res = await fetch(`${ESPN}?dates=${d}`, { cache: "no-store" });
      if (!res.ok) continue;
      json = (await res.json()) as { events?: EspnEvent[] };
    } catch {
      continue;
    }
    for (const e of json.events ?? []) {
      const comp = e.competitions?.[0];
      const cs = comp?.competitors ?? [];
      const home = cs.find((c) => c.homeAway === "home");
      const away = cs.find((c) => c.homeAway === "away");
      const homeName = home?.team?.displayName || home?.team?.name || home?.team?.location || "";
      const awayName = away?.team?.displayName || away?.team?.name || away?.team?.location || "";
      if (!homeName || !awayName) continue;
      const key = `${homeName}|${awayName}|${e.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const num = (s?: string) => (s != null && s !== "" ? Number(s) : null);
      const state = (e.status?.type?.state as EspnLive["state"]) ?? "pre";
      out.push({
        homeName,
        awayName,
        homeScore: num(home?.score),
        awayScore: num(away?.score),
        state,
        completed: !!e.status?.type?.completed,
        dateISO: e.date ?? "",
        detail: e.status?.type?.shortDetail ?? "",
      });
    }
  }
  return out;
}
