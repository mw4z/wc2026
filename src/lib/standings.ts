import { prisma } from "./prisma";
import { teamsEqual } from "./fixtureMapping";
import type { Stage } from "@prisma/client";

// Tournament page data: live group standings (from ESPN) + the knockout bracket
// (from our own DB — Arabic names and our live/final scores). Both refresh in real
// time via client polling of /api/tournament.

const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

export interface StandingTeam {
  nameEn: string;
  nameAr: string;
  code: string | null;
  flagUrl: string | null;
  rank: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  advanced: boolean;
}
export interface StandingGroup {
  name: string;
  teams: StandingTeam[];
}
export interface BracketTeam {
  nameAr: string;
  flagUrl: string | null;
}
export interface BracketMatch {
  matchNumber: number;
  home: BracketTeam | null;
  away: BracketTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // "SCHEDULED" | "LIVE" | "FINISHED" | "SCORED" | ...
  live: boolean;
  kickoffISO: string;
}
export interface BracketRound {
  stage: Stage;
  matches: BracketMatch[];
}
export interface TournamentData {
  groups: StandingGroup[];
  bracket: BracketRound[];
}

interface RawStat {
  abbreviation?: string;
  value?: number;
  displayValue?: string;
}
interface RawEntry {
  team?: { displayName?: string; abbreviation?: string; logos?: { href?: string }[] };
  stats?: RawStat[];
}
interface RawStandings {
  children?: { name?: string; standings?: { entries?: RawEntry[] } }[];
}

// 30s in-memory cache — ESPN standings change slowly, so polling clients are cheap.
let cache: { at: number; groups: { name: string; teams: RawTeam[] }[] } | null = null;
interface RawTeam {
  nameEn: string;
  code: string;
  logo: string | null;
  rank: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  advanced: boolean;
}

async function fetchRawStandings(): Promise<{ name: string; teams: RawTeam[] }[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.groups;
  let json: RawStandings;
  try {
    const res = await fetch(STANDINGS_URL, { cache: "no-store" });
    if (!res.ok) return cache?.groups ?? [];
    json = (await res.json()) as RawStandings;
  } catch {
    return cache?.groups ?? [];
  }
  const groups = (json.children ?? []).map((child) => {
    const num = (e: RawEntry, abbr: string) => {
      const s = e.stats?.find((x) => x.abbreviation === abbr);
      if (!s) return 0;
      const v = s.value ?? Number(s.displayValue);
      return Number.isFinite(v) ? Number(v) : 0;
    };
    const teams: RawTeam[] = (child.standings?.entries ?? []).map((e) => ({
      nameEn: e.team?.displayName ?? "",
      code: e.team?.abbreviation ?? "",
      logo: e.team?.logos?.[0]?.href ?? null,
      rank: num(e, "R"),
      played: num(e, "GP"),
      win: num(e, "W"),
      draw: num(e, "D"),
      loss: num(e, "L"),
      gf: num(e, "F"),
      ga: num(e, "A"),
      gd: num(e, "GD"),
      points: num(e, "P"),
      advanced: num(e, "ADV") === 1,
    }));
    teams.sort((a, b) => a.rank - b.rank || b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    return { name: child.name ?? "", teams };
  });
  cache = { at: Date.now(), groups };
  return groups;
}

const STAGE_ORDER: Stage[] = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"];
const LIVE_WINDOW_MS = 4 * 3600_000;

export async function getTournamentData(): Promise<TournamentData> {
  const [raw, dbTeams, knockout] = await Promise.all([
    fetchRawStandings(),
    prisma.team.findMany({ select: { nameEn: true, nameAr: true, code: true, flagUrl: true } }),
    prisma.match.findMany({
      where: { stage: { in: STAGE_ORDER } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchNumber: "asc" },
    }),
  ]);

  // Enrich ESPN standings with our Arabic names + flags.
  const arOf = (nameEn: string) => dbTeams.find((t) => teamsEqual(t.nameEn, nameEn)) ?? null;
  const groups: StandingGroup[] = raw.map((g) => ({
    name: g.name,
    teams: g.teams.map((t) => {
      const m = arOf(t.nameEn);
      return {
        nameEn: t.nameEn,
        nameAr: m?.nameAr ?? t.nameEn,
        code: m?.code ?? t.code,
        flagUrl: m?.flagUrl ?? t.logo,
        rank: t.rank,
        played: t.played,
        win: t.win,
        draw: t.draw,
        loss: t.loss,
        gf: t.gf,
        ga: t.ga,
        gd: t.gd,
        points: t.points,
        advanced: t.advanced,
      };
    }),
  }));

  // Bracket from our DB matches.
  const now = Date.now();
  const byStage = new Map<Stage, BracketMatch[]>();
  for (const m of knockout) {
    const isDone = m.homeScore != null && m.awayScore != null;
    const isLive = !isDone && m.kickoffAt.getTime() <= now && now - m.kickoffAt.getTime() <= LIVE_WINDOW_MS;
    const team = (t: (typeof m)["homeTeam"]): BracketTeam | null => (t ? { nameAr: t.nameAr, flagUrl: t.flagUrl } : null);
    const list = byStage.get(m.stage) ?? [];
    list.push({
      matchNumber: m.matchNumber,
      home: team(m.homeTeam),
      away: team(m.awayTeam),
      homeScore: isDone ? m.homeScore : isLive ? m.liveHomeScore : null,
      awayScore: isDone ? m.awayScore : isLive ? m.liveAwayScore : null,
      status: m.status,
      live: isLive,
      kickoffISO: m.kickoffAt.toISOString(),
    });
    byStage.set(m.stage, list);
  }
  const bracket: BracketRound[] = STAGE_ORDER.filter((s) => byStage.has(s)).map((s) => ({
    stage: s,
    matches: byStage.get(s)!,
  }));

  return { groups, bracket };
}
