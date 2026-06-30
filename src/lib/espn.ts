// Sole results source: ESPN's free public scoreboard API (no key required).
// Drives BOTH the live in-play score and the official final result + scoring.
// Endpoint: site.api.espn.com — public JSON, returns pre / in / post per event.

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// One goal from ESPN's scoring plays. `side` is relative to ESPN's home/away
// (the caller orients it to our schedule).
export interface EspnGoal {
  side: "home" | "away";
  player: string; // scorer name (Latin), e.g. "Emam Ashour"
  minute: string; // display clock, e.g. "19'", "45+2'"
  note: string | null; // e.g. "Penalty", "Own Goal" — null for a normal goal
}

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
  homeShootout: number | null; // penalty shootout score (ESPN home), when penalties
  awayShootout: number | null; // penalty shootout score (ESPN away), when penalties
  goals: EspnGoal[]; // chronological scoring plays
}

export function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

interface RawCompetitor {
  homeAway?: string;
  score?: string;
  winner?: boolean;
  shootoutScore?: number | string;
  team?: { id?: string; displayName?: string; name?: string; location?: string };
}
interface RawDetail {
  scoringPlay?: boolean;
  shootout?: boolean; // a penalty-shootout kick (separate phase, not an in-match goal)
  type?: { text?: string };
  clock?: { displayValue?: string };
  team?: { id?: string };
  athletesInvolved?: { displayName?: string }[];
}
interface RawEvent {
  date?: string;
  status?: { type?: { state?: string; completed?: boolean; shortDetail?: string } };
  competitions?: { competitors?: RawCompetitor[]; details?: RawDetail[] }[];
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
  return fetchEspnDates(dates);
}

/** Fetch ESPN World Cup events for explicit UTC dates (YYYYMMDD). Used to backfill
 *  goal scorers for matches played on past days. */
export async function fetchEspnDates(dates: string[]): Promise<EspnEvent[]> {
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

      // Scoring plays → goals. ESPN flags them with scoringPlay; type.text carries
      // the kind ("Goal", "Goal - Penalty", "Own Goal"). Map team id → home/away.
      const homeId = home?.team?.id != null ? String(home.team.id) : null;
      const goals: EspnGoal[] = [];
      for (const d of comp?.details ?? []) {
        // Skip penalty-shootout kicks — they're a separate phase, not in-match goals
        // (the shootout result is captured in the final score, not the goal feed).
        if (d.shootout === true) continue;
        const txt = d.type?.text ?? "";
        const isGoal = d.scoringPlay === true || /goal/i.test(txt);
        if (!isGoal) continue;
        const player = d.athletesInvolved?.[0]?.displayName?.trim();
        if (!player) continue;
        const side: "home" | "away" = homeId != null && String(d.team?.id) === homeId ? "home" : "away";
        const note = /penalt/i.test(txt) ? "Penalty" : /own/i.test(txt) ? "Own Goal" : null;
        goals.push({ side, player, minute: d.clock?.displayValue ?? "", note });
      }

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
        homeShootout: num(home?.shootoutScore != null ? String(home.shootoutScore) : undefined),
        awayShootout: num(away?.shootoutScore != null ? String(away.shootoutScore) : undefined),
        goals,
      });
    }
  }
  return out;
}

/** Live (in-play) subset — today ± a day. */
export async function fetchEspnLive(): Promise<EspnEvent[]> {
  return fetchEspnEvents(1);
}
