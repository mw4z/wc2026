import { prisma } from "./prisma";
import { teamsEqual } from "./fixtureMapping";
import { resolvePhotos } from "./playerPhotoResolver";

// Match Center: lineups + formations + live events for a single match, from ESPN's
// free `summary` endpoint. We resolve our match → ESPN event by team names + date,
// then parse the rosters (formation, jersey, headshot, stats) and key events
// (goals, cards, subs). Player ratings (1–10) are COMPUTED by us from ESPN's raw
// per-player stats — no free source publishes a rating, so this is our own metric.

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

export type Side = "home" | "away";
export type MatchEventType =
  | "goal"
  | "own-goal"
  | "penalty-goal"
  | "penalty-missed"
  | "yellow"
  | "red"
  | "second-yellow"
  | "sub"
  | "var"
  | "other";

export interface LineupPlayer {
  id: string;
  name: string; // ESPN short name (Latin)
  jersey: string;
  posAbbr: string; // G / D / M / F
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  headshot: string | null;
  rating: number | null; // our computed 1–10 (null pre-match / never played)
  goals: number;
  yellow: boolean;
  red: boolean;
  x: number; // pitch position %, 0..100 (left→right)
  y: number; // pitch position %, 0..100 (own goal→halfway within the team's half)
}
export interface TeamLineup {
  side: Side;
  formation: string | null;
  starters: LineupPlayer[];
  bench: LineupPlayer[];
}
export interface MatchEvent {
  minute: string;
  type: MatchEventType;
  side: Side | null;
  player: string | null;
  text: string;
}
export interface MatchCenter {
  available: boolean; // false until ESPN publishes lineups (≈1h before kickoff)
  state: "pre" | "in" | "post";
  statusDetail: string; // e.g. "45'", "HT", "FT"
  home: TeamLineup | null;
  away: TeamLineup | null;
  events: MatchEvent[];
}

// ---- ESPN raw shapes (only the fields we read) ----
interface RawAthlete {
  id?: string;
  displayName?: string;
  shortName?: string;
  headshot?: { href?: string };
}

// ESPN hosts player photos at a predictable URL keyed by athlete id. The summary
// often omits the `headshot` field even when the photo exists, so we construct it
// from the id and let the client fall back (to the flag) if it 404s.
function headshotUrl(a: RawAthlete | undefined): string | null {
  if (a?.headshot?.href) return a.headshot.href;
  if (a?.id) return `https://a.espncdn.com/i/headshots/soccer/players/full/${a.id}.png`;
  return null;
}
interface RawStat {
  name?: string;
  abbreviation?: string;
  value?: number;
  displayValue?: string;
}
interface RawRosterPlayer {
  starter?: boolean;
  jersey?: string;
  subbedIn?: boolean;
  subbedOut?: boolean;
  formationPlace?: string | number;
  athlete?: RawAthlete;
  position?: { abbreviation?: string };
  stats?: RawStat[];
}
interface RawRoster {
  homeAway?: string;
  formation?: string;
  team?: { id?: string; displayName?: string };
  roster?: RawRosterPlayer[];
}
interface RawKeyEvent {
  type?: { text?: string; type?: string };
  clock?: { displayValue?: string };
  scoringPlay?: boolean;
  team?: { id?: string; displayName?: string };
  participants?: { athlete?: RawAthlete }[];
  athletesInvolved?: RawAthlete[];
}
interface RawSummary {
  rosters?: RawRoster[];
  keyEvents?: RawKeyEvent[];
  header?: {
    competitions?: { status?: { type?: { state?: string; shortDetail?: string } } }[];
  };
}

// ---- caches (keep ESPN polite; many clients → ~1 request per window) ----
const eventIdCache = new Map<string, { at: number; id: string | null }>();
const summaryCache = new Map<string, { at: number; data: RawSummary }>();
const EVENT_ID_TTL = 30 * 60_000; // event id never changes for a match
const SUMMARY_TTL = 20_000; // refresh live data ~every 20s

function statNum(stats: RawStat[] | undefined, name: string): number {
  const s = stats?.find((x) => x.name === name || x.abbreviation === name);
  if (!s) return 0;
  const v = s.value ?? Number(s.displayValue);
  return Number.isFinite(v) ? Number(v) : 0;
}

// Our own live player rating (1–10) from ESPN's raw per-player stats. Heuristic,
// not a licensed metric — tuned to feel sensible: keepers rewarded for saves,
// outfielders for goals/assists/shots, everyone penalised for cards & fouls.
function computeRating(p: RawRosterPlayer): number | null {
  const played = p.starter === true || p.subbedIn === true;
  if (!played) return null;
  const s = p.stats;
  // Stats only populate once the match is underway; empty → pre-match, no rating.
  if (!s || s.length === 0 || statNum(s, "appearances") < 1) return null;
  const isGK = (p.position?.abbreviation ?? "") === "G";

  let r = 6.0;
  r += statNum(s, "totalGoals") * 1.2 || statNum(s, "goals") * 1.2;
  r += statNum(s, "goalAssists") * 0.9;
  r += statNum(s, "shotsOnTarget") * 0.15;
  r += statNum(s, "wonContest") * 0.08; // successful dribbles
  r += statNum(s, "totalTackles") * 0.05;
  r += statNum(s, "interceptions") * 0.05;
  if (isGK) r += Math.min(statNum(s, "saves") * 0.22, 2.2);
  r -= statNum(s, "yellowCards") * 0.5;
  r -= statNum(s, "redCards") * 2.5;
  r -= statNum(s, "foulsCommitted") * 0.08;
  r -= statNum(s, "ownGoals") * 1.5;
  if (isGK) r -= statNum(s, "goalsConceded") * 0.3;

  r = Math.max(4.0, Math.min(10.0, r));
  return Math.round(r * 10) / 10;
}

// Split starters (ordered by formationPlace) into pitch lines using the formation
// digits, and assign each player an (x, y) within the team's own half.
function layoutStarters(players: LineupPlayer[], formation: string | null, side: Side): void {
  const sorted = players; // already sorted by formationPlace by the caller
  const digits = (formation ?? "")
    .split("-")
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Lines from the back: GK, then each formation line.
  const lines: number[] = [1, ...digits];
  const outfield = digits.reduce((a, b) => a + b, 0);
  const usable = sorted.length === 11 && outfield === 10;

  // Each team is confined to its OWN HALF: away occupies the top (y 6..46), home
  // the bottom (y 54..94). `frac` runs 0 (own goal line) → 1 (just before halfway).
  const yFor = (frac: number) => (side === "home" ? 94 - frac * 40 : 6 + frac * 40);

  if (!usable) {
    // Fallback: even grid within the team's half, GK row first.
    const per = 4;
    const rows = Math.max(1, Math.ceil(sorted.length / per));
    sorted.forEach((p, i) => {
      const row = Math.floor(i / per);
      const inRow = sorted.filter((_, j) => Math.floor(j / per) === row).length;
      const col = i % per;
      p.x = ((col + 1) / (inRow + 1)) * 100;
      p.y = yFor(rows === 1 ? 0.5 : row / (rows - 1));
    });
    return;
  }

  const R = lines.length;
  let idx = 0;
  lines.forEach((count, li) => {
    const y = yFor(R === 1 ? 0.5 : li / (R - 1));
    for (let k = 0; k < count; k++) {
      const p = sorted[idx++]!;
      p.x = ((k + 1) / (count + 1)) * 100;
      p.y = y;
    }
  });
}

function parseRoster(raw: RawRoster, side: Side, photos: Map<string, string | null>): TeamLineup {
  const all: LineupPlayer[] = (raw.roster ?? []).map((p) => ({
    id: p.athlete?.id ?? "",
    name: p.athlete?.shortName || p.athlete?.displayName || "",
    jersey: p.jersey ?? "",
    posAbbr: p.position?.abbreviation ?? "",
    starter: p.starter === true,
    subbedIn: p.subbedIn === true,
    subbedOut: p.subbedOut === true,
    // Wikipedia photo (resolved by full name) → ESPN field → ESPN-by-id (best effort).
    headshot: photos.get(p.athlete?.displayName ?? "") || headshotUrl(p.athlete),
    rating: computeRating(p),
    goals: statNum(p.stats, "totalGoals") || statNum(p.stats, "goals"),
    yellow: statNum(p.stats, "yellowCards") > 0,
    red: statNum(p.stats, "redCards") > 0,
    x: 50,
    y: 50,
    _place: typeof p.formationPlace === "string" ? parseInt(p.formationPlace, 10) : p.formationPlace ?? 99,
  })) as (LineupPlayer & { _place: number })[];

  const starters = (all as (LineupPlayer & { _place: number })[])
    .filter((p) => p.starter)
    .sort((a, b) => a._place - b._place);
  const bench = all.filter((p) => !p.starter);
  layoutStarters(starters, raw.formation ?? null, side);
  // strip helper field
  const clean = (p: LineupPlayer & { _place?: number }) => {
    delete p._place;
    return p as LineupPlayer;
  };
  return {
    side,
    formation: raw.formation ?? null,
    starters: starters.map(clean),
    bench: bench.map(clean),
  };
}

function eventType(e: RawKeyEvent): MatchEventType {
  const tt = (e.type?.type ?? "").toLowerCase();
  const tx = (e.type?.text ?? "").toLowerCase();
  const blob = `${tt} ${tx}`;
  if (e.scoringPlay || /goal/.test(blob)) {
    if (/own/.test(blob)) return "own-goal";
    if (/penalt/.test(blob)) return "penalty-goal";
    return "goal";
  }
  if (/penalt/.test(blob) && /(miss|saved)/.test(blob)) return "penalty-missed";
  if (/(second.?yellow|yellow.?red)/.test(blob)) return "second-yellow";
  if (/red/.test(blob)) return "red";
  if (/yellow/.test(blob)) return "yellow";
  if (/sub/.test(blob)) return "sub";
  if (/var/.test(blob)) return "var";
  return "other";
}

async function findEventId(match: { kickoffAt: Date; homeEn: string; awayEn: string }): Promise<string | null> {
  const key = `${match.homeEn}|${match.awayEn}|${match.kickoffAt.toISOString().slice(0, 10)}`;
  const c = eventIdCache.get(key);
  if (c && Date.now() - c.at < EVENT_ID_TTL) return c.id;

  // Probe the kickoff day ± 1 (timezone slack).
  const k = match.kickoffAt.getTime();
  const days = [k - 86_400_000, k, k + 86_400_000].map((t) => {
    const d = new Date(t);
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  });
  let id: string | null = null;
  for (const day of [...new Set(days)]) {
    let json: { events?: { id?: string; competitions?: { competitors?: { team?: { displayName?: string } }[] }[] }[] };
    try {
      const res = await fetch(`${SCOREBOARD}?dates=${day}`, { cache: "no-store" });
      if (!res.ok) continue;
      json = await res.json();
    } catch {
      continue;
    }
    for (const ev of json.events ?? []) {
      const cs = ev.competitions?.[0]?.competitors ?? [];
      const names = cs.map((c) => c.team?.displayName ?? "");
      if (names.length < 2) continue;
      const matchesPair =
        (teamsEqual(names[0]!, match.homeEn) && teamsEqual(names[1]!, match.awayEn)) ||
        (teamsEqual(names[0]!, match.awayEn) && teamsEqual(names[1]!, match.homeEn));
      if (matchesPair && ev.id) {
        id = ev.id;
        break;
      }
    }
    if (id) break;
  }
  eventIdCache.set(key, { at: Date.now(), id });
  return id;
}

async function fetchSummary(eventId: string): Promise<RawSummary | null> {
  const c = summaryCache.get(eventId);
  if (c && Date.now() - c.at < SUMMARY_TTL) return c.data;
  try {
    const res = await fetch(`${SUMMARY}?event=${eventId}`, { cache: "no-store" });
    if (!res.ok) return c?.data ?? null;
    const data = (await res.json()) as RawSummary;
    summaryCache.set(eventId, { at: Date.now(), data });
    return data;
  } catch {
    return c?.data ?? null;
  }
}

export async function getMatchCenter(matchId: string): Promise<MatchCenter> {
  const empty: MatchCenter = { available: false, state: "pre", statusDetail: "", home: null, away: null, events: [] };
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match?.homeTeam || !match.awayTeam) return empty;

  const eventId = await findEventId({
    kickoffAt: match.kickoffAt,
    homeEn: match.homeTeam.nameEn,
    awayEn: match.awayTeam.nameEn,
  });
  if (!eventId) return empty;

  const sum = await fetchSummary(eventId);
  if (!sum) return empty;

  const st = sum.header?.competitions?.[0]?.status?.type;
  const state = (st?.state as MatchCenter["state"]) ?? "pre";
  const statusDetail = st?.shortDetail ?? "";

  // Map ESPN rosters to OUR home/away by team name.
  const rosters = sum.rosters ?? [];

  // Resolve a photo for EVERY player (Wikipedia, cached). Skip names ESPN already
  // gives a photo for to save lookups.
  const names: string[] = [];
  for (const r of rosters) {
    for (const p of r.roster ?? []) {
      const dn = p.athlete?.displayName;
      if (dn && !p.athlete?.headshot?.href) names.push(dn);
    }
  }
  const photos = names.length ? await resolvePhotos(names) : new Map<string, string | null>();

  let home: TeamLineup | null = null;
  let away: TeamLineup | null = null;
  for (const r of rosters) {
    const dn = r.team?.displayName ?? "";
    const isHome = teamsEqual(dn, match.homeTeam.nameEn);
    const isAway = teamsEqual(dn, match.awayTeam.nameEn);
    const side: Side = isHome ? "home" : isAway ? "away" : (r.homeAway === "home" ? "home" : "away");
    const lineup = parseRoster(r, side, photos);
    if (side === "home") home = lineup;
    else away = lineup;
  }
  const hasLineups = (home?.starters.length ?? 0) > 0 || (away?.starters.length ?? 0) > 0;

  const events: MatchEvent[] = (sum.keyEvents ?? [])
    .map((e) => {
      const dn = e.team?.displayName ?? "";
      const side: Side | null = teamsEqual(dn, match.homeTeam!.nameEn)
        ? "home"
        : teamsEqual(dn, match.awayTeam!.nameEn)
          ? "away"
          : null;
      const player = e.participants?.[0]?.athlete?.displayName ?? e.athletesInvolved?.[0]?.displayName ?? null;
      return {
        minute: e.clock?.displayValue ?? "",
        type: eventType(e),
        side,
        player,
        text: e.type?.text ?? "",
      };
    })
    // Keep only meaningful, well-typed events (drop kickoff/half markers).
    .filter((e) => e.type !== "other" || /goal|card|substitut|penalt|var/i.test(e.text));

  return { available: hasLineups, state, statusDetail, home, away, events };
}
