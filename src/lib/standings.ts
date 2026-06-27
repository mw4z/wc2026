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
  advanced: boolean; // top-2 of the group — qualifies directly
  thirdQualified: boolean; // 3rd-placed but currently inside the 8 best-thirds cut → also qualifying
  movement: number | null; // position change since the last completed matchday (+up / -down)
  live: { gf: number; ga: number } | null; // this team's running score if its match is in play now
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
  const [raw, dbTeams, knockout, groupMatches] = await Promise.all([
    fetchRawStandings(),
    prisma.team.findMany({ select: { nameEn: true, nameAr: true, code: true, flagUrl: true } }),
    prisma.match.findMany({
      where: { stage: { in: STAGE_ORDER } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchNumber: "asc" },
    }),
    prisma.match.findMany({
      where: { stage: "GROUP", homeScore: null, awayScore: null },
      include: { homeTeam: true, awayTeam: true },
    }),
  ]);

  // Map each team currently playing a group match → its running (in-play) score.
  // Keyed by the team's English name so we can match it to the ESPN standings row.
  const now0 = Date.now();
  const liveByTeam = new Map<string, { gf: number; ga: number }>();
  for (const m of groupMatches) {
    const playing = m.kickoffAt.getTime() <= now0 && now0 - m.kickoffAt.getTime() <= LIVE_WINDOW_MS;
    if (!playing || !m.homeTeam || !m.awayTeam) continue;
    const h = m.liveHomeScore ?? 0;
    const a = m.liveAwayScore ?? 0;
    liveByTeam.set(m.homeTeam.nameEn, { gf: h, ga: a });
    liveByTeam.set(m.awayTeam.nameEn, { gf: a, ga: h });
  }

  // Enrich ESPN standings with our Arabic names + flags.
  const arOf = (nameEn: string) => dbTeams.find((t) => teamsEqual(t.nameEn, nameEn)) ?? null;
  const liveOf = (nameEn: string) => {
    for (const [en, sc] of liveByTeam) if (teamsEqual(en, nameEn)) return sc;
    return null;
  };
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
        thirdQualified: false,
        movement: null as number | null,
        live: liveOf(t.nameEn),
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

  const cmp = (a: StandingTeam, b: StandingTeam) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.win - a.win;
  const codeOf = (t: StandingTeam) => t.code || t.nameEn;

  // Best third-placed teams — the 8 best of the 12 group 3rd-placers also qualify.
  // Take each group's 3rd team (sorted index 2) and rank by points → GD → GF → wins.
  let thirdPlace: ThirdPlaceRow[] = groups
    .filter((g) => g.teams.length >= 3)
    .map((g) => ({ group: g.name, team: g.teams[2]!, movement: null as number | null }))
    .sort((a, b) => cmp(a.team, b.team));
  // The 8 best third-placed teams also qualify — mark them (same object refs as in
  // `groups`, so the group tables light up green too).
  thirdPlace.forEach((r, i) => {
    r.team.thirdQualified = i < 8;
  });

  // Position-movement arrows (▲/▼), like the leaderboard. Snapshot ranks per group
  // (and the 3rd-place ranking) and compare across completed matchdays. Computed on
  // OFFICIAL (full-time) stats, before the live provisional fold below, so in-play
  // matches don't churn the matchday snapshot.
  await applyMovements(groups, thirdPlace);

  // ---- Live provisional standings ----
  // While matches are in play, fold each live team's running result into its tally
  // and re-sort, so points and positions update in real time — not only at
  // full-time. (Recomputed each request from fresh ESPN data; never persisted.)
  if (groups.some((g) => g.teams.some((t) => t.live))) {
    // Official 3rd-place ranking (before the live fold) — to show how the live
    // results shuffle the best-third table.
    const officialThirdRank = new Map<string, number>();
    thirdPlace.forEach((r, i) => officialThirdRank.set(codeOf(r.team), i + 1));

    for (const g of groups) {
      // Remember each team's full-time position in this group, then fold in the
      // live result and re-sort. The arrow shows full-time → live movement.
      const officialRank = new Map<string, number>();
      g.teams.forEach((t, i) => officialRank.set(codeOf(t), i + 1));

      for (const t of g.teams) {
        if (!t.live) continue;
        const { gf, ga } = t.live;
        t.played += 1;
        t.gf += gf;
        t.ga += ga;
        t.gd = t.gf - t.ga;
        if (gf > ga) {
          t.win += 1;
          t.points += 3;
        } else if (gf === ga) {
          t.draw += 1;
          t.points += 1;
        } else {
          t.loss += 1;
        }
      }
      g.teams.sort(cmp);
      g.teams.forEach((t, i) => {
        const before = officialRank.get(codeOf(t));
        t.movement = before == null ? null : before - (i + 1);
      });
    }

    // Re-derive the best-third cut from the provisional order, with live movement.
    for (const g of groups) for (const t of g.teams) t.thirdQualified = false;
    thirdPlace = groups
      .filter((g) => g.teams.length >= 3)
      .map((g) => ({ group: g.name, team: g.teams[2]!, movement: null as number | null }))
      .sort((a, b) => cmp(a.team, b.team));
    thirdPlace.forEach((r, i) => {
      r.team.thirdQualified = i < 8;
      const before = officialThirdRank.get(codeOf(r.team));
      r.movement = before == null ? null : before - (i + 1);
    });
  }

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
