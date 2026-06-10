// Pure unit tests for the result-sync logic. No DB / network.
//   npx tsx scripts/result-sync-test.ts
export {};

import {
  parseApiFootball,
  parseFootballData,
  deriveMatchResult,
  orientToMatch,
  type ApiFootballRaw,
  type FootballDataRaw,
} from "../src/lib/resultSyncCore";
import { calculatePredictionPoints } from "../src/lib/scoring";
import { evaluateMapping, teamsEqual, type FixtureCandidate } from "../src/lib/fixtureMapping";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log("  ok   -", name); }
  else { fail++; console.log("  FAIL -", name, extra); }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---- raw builders ----
function af(o: Partial<{ id: number; status: string; gh: number | null; ga: number | null; penH: number | null; homeWin: boolean | null; awayWin: boolean | null; home: string; away: string }>): ApiFootballRaw {
  return {
    fixture: { id: o.id ?? 1, date: "2026-06-15T18:00:00+00:00", status: { short: o.status ?? "FT" }, venue: { name: "Stadium" } },
    teams: { home: { name: o.home ?? "Home", winner: o.homeWin ?? null }, away: { name: o.away ?? "Away", winner: o.awayWin ?? null } },
    goals: { home: o.gh ?? null, away: o.ga ?? null },
    score: { penalty: { home: o.penH ?? null, away: null } },
  };
}
function fd(o: Partial<{ id: number; status: string; gh: number | null; ga: number | null; winner: string | null; duration: string; home: string; away: string }>): FootballDataRaw {
  return {
    id: o.id ?? 1,
    utcDate: "2026-06-15T18:00:00Z",
    status: o.status ?? "FINISHED",
    homeTeam: { name: o.home ?? "Home" },
    awayTeam: { name: o.away ?? "Away" },
    score: { winner: o.winner ?? null, duration: o.duration ?? "REGULAR", fullTime: { home: o.gh ?? null, away: o.ga ?? null } },
  };
}

const GROUP = { stage: "GROUP" as const, homeTeamId: "A", awayTeamId: "B" };
const KO = { stage: "ROUND_OF_16" as const, homeTeamId: "A", awayTeamId: "B" };

console.log("== 1. provider parsing ==");
{
  const a = parseApiFootball(af({ status: "FT", gh: 2, ga: 1 }));
  check("api-football FT final", a.isFinal && a.goalsHome === 2 && a.goalsAway === 1 && a.wentToPenalties === false);
  const aPen = parseApiFootball(af({ status: "PEN", gh: 1, ga: 1, penH: 4, homeWin: true }));
  check("api-football PEN → penalties + winner", aPen.isFinal && aPen.wentToPenalties && aPen.homeWinner === true);
  check("api-football 1H not final", parseApiFootball(af({ status: "1H" })).isFinal === false);

  const d = parseFootballData(fd({ status: "FINISHED", gh: 3, ga: 0 }));
  check("football-data FINISHED final", d.isFinal && d.goalsHome === 3 && d.goalsAway === 0);
  const dPen = parseFootballData(fd({ status: "FINISHED", gh: 1, ga: 1, duration: "PENALTY_SHOOTOUT", winner: "AWAY_TEAM" }));
  check("football-data shootout → penalties + away winner", dPen.wentToPenalties && dPen.awayWinner === true && dPen.homeWinner === false);
  check("football-data TIMED not final", parseFootballData(fd({ status: "TIMED", gh: null, ga: null })).isFinal === false);
}

console.log("\n== 2. group stage scoring ==");
{
  const d = deriveMatchResult(GROUP, parseFootballData(fd({ status: "FINISHED", gh: 2, ga: 1, home: "A", away: "B" })));
  check("group final → score, no qualifier", d.action === "score" && d.result?.winnerTeamId === null);
  const a = { actualHome: 2, actualAway: 1, actualWinnerTeamId: null, isKnockout: false };
  check("exact 2-1 = 3", calculatePredictionPoints({ ...a, predHome: 2, predAway: 1, predWinnerTeamId: null }).points === 3);
  check("outcome 1-0 = 1", calculatePredictionPoints({ ...a, predHome: 1, predAway: 0, predWinnerTeamId: null }).points === 1);
  check("wrong 0-2 = 0", calculatePredictionPoints({ ...a, predHome: 0, predAway: 2, predWinnerTeamId: null }).points === 0);
}

console.log("\n== 3. knockout tied-before-penalties + qualifier ==");
{
  const d = deriveMatchResult(KO, parseFootballData(fd({ status: "FINISHED", gh: 1, ga: 1, duration: "PENALTY_SHOOTOUT", winner: "HOME_TEAM", home: "A", away: "B" })));
  check("knockout PEN → score", d.action === "score");
  check("score stays draw 1-1", d.result?.homeScore === 1 && d.result?.awayScore === 1);
  check("penalties recorded", d.result?.wentToPenalties === true);
  check("qualifier = our home team A", d.result?.winnerTeamId === "A");
  const a = { actualHome: 1, actualAway: 1, actualWinnerTeamId: "A", isKnockout: true };
  check("exact draw + right qualifier = 4", calculatePredictionPoints({ ...a, predHome: 1, predAway: 1, predWinnerTeamId: "A" }).points === 4);
  check("exact draw + wrong qualifier = 3", calculatePredictionPoints({ ...a, predHome: 1, predAway: 1, predWinnerTeamId: "B" }).points === 3);
  check("draw outcome + right qualifier = 2", calculatePredictionPoints({ ...a, predHome: 0, predAway: 0, predWinnerTeamId: "A" }).points === 2);
}

console.log("\n== 4. knockout unclear qualifier → review ==");
{
  const d = deriveMatchResult(KO, parseFootballData(fd({ status: "FINISHED", gh: 1, ga: 1, winner: null, home: "A", away: "B" })));
  check("unclear winner → review (not score)", d.action === "review" && d.result?.winnerTeamId === null);
}

console.log("\n== 5. never score before final / missing ==");
{
  check("non-final → skip", deriveMatchResult(GROUP, parseFootballData(fd({ status: "IN_PLAY", gh: 1, ga: 0 }))).action === "skip");
  check("final but no goals → skip", deriveMatchResult(GROUP, parseFootballData(fd({ status: "FINISHED", gh: null, ga: null }))).action === "skip");
}

console.log("\n== 6. orientation (swap to our schedule) ==");
{
  // Provider lists Mexico (home) 2-1 South Africa; OUR match is South Africa vs Mexico.
  const prov = parseFootballData(fd({ status: "FINISHED", gh: 2, ga: 1, home: "Mexico", away: "South Africa" }));
  const same = orientToMatch(prov, "Mexico", "South Africa");
  check("same orientation unchanged", same.orientation === "same" && same.fixture.goalsHome === 2 && same.fixture.goalsAway === 1);
  const rev = orientToMatch(prov, "South Africa", "Mexico");
  check("reversed → orientation reversed", rev.orientation === "reversed");
  check("reversed swaps goals to 1-2", rev.fixture.goalsHome === 1 && rev.fixture.goalsAway === 2);
  const unknown = orientToMatch(prov, "Brazil", "Croatia");
  check("unrelated teams → unknown", unknown.orientation === "unknown");
  // End-to-end: reversed group result scores against our orientation.
  const our = { stage: "GROUP" as const, homeTeamId: "SA", awayTeamId: "MX" };
  const d = deriveMatchResult(our, rev.fixture);
  check("reversed group derive → 1-2", d.action === "score" && d.result?.homeScore === 1 && d.result?.awayScore === 2);
}

console.log("\n== 7. fixture mapping (pair-based; ambiguous withheld) ==");
{
  const base = (over: Partial<FixtureCandidate>): FixtureCandidate => ({
    fixtureId: "f1", dateISO: "2026-06-15T18:00:00+00:00", homeName: "Brazil", awayName: "Croatia", ...over,
  });
  const match = { kickoffAt: new Date("2026-06-15T18:00:00Z"), homeName: "Brazil", awayName: "Croatia" };
  check("exact pair → mapped", evaluateMapping(match, [base({})]).status === "mapped");
  check("reversed pair → still mapped (orientation handled at sync)", evaluateMapping(match, [base({ fixtureId: "fR", homeName: "Croatia", awayName: "Brazil" })]).status === "mapped");
  check("two candidate fixtures → ambiguous", evaluateMapping(match, [base({ fixtureId: "f1" }), base({ fixtureId: "f2" })]).status === "ambiguous");
  check("no candidate near time → unmapped", evaluateMapping(match, [base({ dateISO: "2026-07-01T18:00:00+00:00" })]).status === "unmapped");
  check("alias USA == United States", teamsEqual("USA", "United States"));
  check("alias Bosnia-Herzegovina == Bosnia and Herzegovina", teamsEqual("Bosnia-Herzegovina", "Bosnia and Herzegovina"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
