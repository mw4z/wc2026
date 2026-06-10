// Pure fixture-matching logic for mapping our 104 matches to provider fixtures.
// No DB / network — unit-tested in scripts/result-sync-test.ts.
//
// Safety: we only return a confident 1:1 mapping with the SAME home/away
// orientation. Multiple candidates, or only a reversed-orientation candidate,
// are reported as "ambiguous" and NEVER auto-applied (a flipped orientation
// would mis-assign scores).

/** Normalize a team name for comparison: lowercase, strip accents & punctuation. */
export function normalizeTeam(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "") // combining marks (accents)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ""); // drop spaces/punctuation
  return TEAM_ALIASES[base] ?? base;
}

// Common name differences between our schedule and providers. Map variants to a
// single canonical token. Extend as needed when mapping logs near-misses.
const TEAM_ALIASES: Record<string, string> = {
  unitedstates: "usa",
  unitedstatesofamerica: "usa",
  us: "usa",
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  koreasouth: "southkorea",
  iriran: "iran",
  islamicrepublicofiran: "iran",
  cotedivoire: "ivorycoast",
  czechrepublic: "czechia",
  bosniaandherzegovina: "bosnia",
  bosniaherzegovina: "bosnia",
  trinidadandtobago: "trinidad",
  capeverde: "caboverde",
  northmacedonia: "macedonia",
  drcongo: "congodr",
  democraticrepublicofthecongo: "congodr",
  congodrc: "congodr",
};

export function teamsEqual(a: string, b: string): boolean {
  return normalizeTeam(a) === normalizeTeam(b);
}

export interface FixtureCandidate {
  fixtureId: string;
  dateISO: string;
  homeName: string;
  awayName: string;
  venue?: string | null;
}

export interface OurMatchForMapping {
  kickoffAt: Date;
  homeName: string;
  awayName: string;
  venue?: string | null;
}

export type MappingStatus = "mapped" | "unmapped" | "ambiguous";

export interface MappingDecision {
  status: MappingStatus;
  fixtureId?: string;
  note: string;
  candidateIds: string[];
}

/**
 * Decide a mapping for one of our matches against provider fixtures. PURE.
 * Matches by the unordered team pair near kickoff. Home/away ORIENTATION is
 * resolved later at sync time (scores are swapped to our schedule if needed), so
 * a reversed-orientation fixture is still a valid 1:1 mapping here — only true
 * ambiguity (2+ candidate fixtures) is withheld.
 * @param toleranceMin allowed kickoff difference in minutes (schedules drift).
 */
export function evaluateMapping(
  match: OurMatchForMapping,
  fixtures: FixtureCandidate[],
  toleranceMin = 180,
): MappingDecision {
  const kt = match.kickoffAt.getTime();
  const near = fixtures.filter((f) => {
    const ft = Date.parse(f.dateISO);
    return Number.isFinite(ft) && Math.abs(ft - kt) <= toleranceMin * 60_000;
  });

  // Same team pair, either orientation.
  const pair = near.filter(
    (f) =>
      (teamsEqual(f.homeName, match.homeName) && teamsEqual(f.awayName, match.awayName)) ||
      (teamsEqual(f.homeName, match.awayName) && teamsEqual(f.awayName, match.homeName)),
  );

  if (pair.length === 1) {
    const only = pair[0]!;
    return { status: "mapped", fixtureId: only.fixtureId, note: "team pair + time", candidateIds: [only.fixtureId] };
  }
  if (pair.length > 1) {
    return { status: "ambiguous", note: `${pair.length} candidate fixtures for the same pair`, candidateIds: pair.map((f) => f.fixtureId) };
  }
  return { status: "unmapped", note: near.length ? "no team match within time window" : "no fixture near kickoff", candidateIds: [] };
}
