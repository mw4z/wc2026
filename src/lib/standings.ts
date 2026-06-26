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
  movement: number | null; // position change since the last completed matchday (+up / -down)
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
export interface ThirdPlaceRow {
  group: string;
  team: StandingTeam;
  movement: number | null; // change in the 3rd-place ranking since the last matchday
}
export interface TournamentData {
  groups: StandingGroup[];
  thirdPlace: ThirdPlaceRow[];
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
        movement: null as number | null,
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

  // Best third-placed teams — the 8 best of the 12 group 3rd-placers also qualify.
  // Take each group's 3rd team (sorted index 2) and rank by points → GD → GF → wins.
  const thirdPlace: ThirdPlaceRow[] = groups
    .filter((g) => g.teams.length >= 3)
    .map((g) => ({ group: g.name, team: g.teams[2]!, movement: null as number | null }))
    .sort(
      (a, b) =>
        b.team.points - a.team.points ||
        b.team.gd - a.team.gd ||
        b.team.gf - a.team.gf ||
        b.team.win - a.team.win,
    );

  // Position-movement arrows (▲/▼), like the leaderboard. Snapshot ranks per group
  // (and the 3rd-place ranking) and compare across completed matchdays.
  await applyMovements(groups, thirdPlace);

  return { groups, thirdPlace, bracket };
}

interface PosSnap {
  round: number;
  ranks: Record<string, number>;
  prev: Record<string, number>;
}
type PosStore = Record<string, PosSnap>;

// Rotate one ranking's snapshot and return movement (prevRank - currentRank) per key.
// Movement persists until a new match is completed in that ranking (round advances).
function rotatePositions(store: PosStore, key: string, ranks: Record<string, number>, round: number): Record<string, number | null> {
  const prev = store[key];
  let baseline: Record<string, number>;
  if (!prev) {
    store[key] = { round, ranks, prev: ranks };
    baseline = ranks;
  } else if (round > prev.round) {
    store[key] = { round, ranks, prev: prev.ranks };
    baseline = prev.ranks;
  } else {
    baseline = prev.prev;
  }
  const moves: Record<string, number | null> = {};
  for (const code of Object.keys(ranks)) {
    const b = baseline[code];
    moves[code] = b == null ? null : b - ranks[code]!;
  }
  return moves;
}

async function applyMovements(groups: StandingGroup[], thirdPlace: ThirdPlaceRow[]): Promise<void> {
  let store: PosStore = {};
  try {
    const row = await prisma.setting.findUnique({ where: { key: "tournament_pos" } });
    if (row?.value) store = JSON.parse(row.value) as PosStore;
  } catch {
    /* start fresh if unreadable */
  }
  const before = JSON.stringify(store);
  const codeOf = (t: StandingTeam) => t.code || t.nameEn;

  for (const g of groups) {
    const ranks: Record<string, number> = {};
    let round = 0;
    g.teams.forEach((t, i) => {
      ranks[codeOf(t)] = i + 1;
      round += t.played;
    });
    const moves = rotatePositions(store, `G:${g.name}`, ranks, round);
    g.teams.forEach((t) => (t.movement = moves[codeOf(t)] ?? null));
  }

  const tpRanks: Record<string, number> = {};
  let tpRound = 0;
  thirdPlace.forEach((r, i) => {
    tpRanks[codeOf(r.team)] = i + 1;
    tpRound += r.team.played;
  });
  const tpMoves = rotatePositions(store, "THIRD", tpRanks, tpRound);
  thirdPlace.forEach((r) => (r.movement = tpMoves[codeOf(r.team)] ?? null));

  if (JSON.stringify(store) !== before) {
    try {
      await prisma.setting.upsert({
        where: { key: "tournament_pos" },
        create: { key: "tournament_pos", value: JSON.stringify(store) },
        update: { value: JSON.stringify(store) },
      });
    } catch {
      /* best-effort */
    }
  }
}
