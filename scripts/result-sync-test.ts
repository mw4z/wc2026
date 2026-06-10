// Pure unit tests for the result-sync logic. No DB / network.
//   npx tsx scripts/result-sync-test.ts
export {};

import { parseFixture, deriveMatchResult, FINAL_STATUSES } from "../src/lib/resultSyncCore";
import { calculatePredictionPoints } from "../src/lib/scoring";
import { evaluateMapping, teamsEqual, type FixtureCandidate } from "../src/lib/fixtureMapping";
import type { RawFixture } from "../src/lib/footballApi";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log("  ok   -", name); }
  else { fail++; console.log("  FAIL -", name, extra); }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Build a raw provider fixture with sensible defaults.
function raw(o: Partial<{
  id: number; status: string; gh: number | null; ga: number | null;
  penH: number | null; penA: number | null; homeWin: boolean | null; awayWin: boolean | null;
}>): RawFixture {
  return {
    fixture: { id: o.id ?? 1, date: "2026-06-15T18:00:00+00:00", status: { short: o.status ?? "FT", long: "" }, venue: { name: "Stadium" } },
    teams: {
      home: { id: 10, name: "Home", winner: o.homeWin ?? null },
      away: { id: 20, name: "Away", winner: o.awayWin ?? null },
    },
    goals: { home: o.gh ?? null, away: o.ga ?? null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: o.gh ?? null, away: o.ga ?? null },
      extratime: { home: null, away: null },
      penalty: { home: o.penH ?? null, away: o.penA ?? null },
    },
  };
}

const GROUP = { stage: "GROUP" as const, homeTeamId: "A", awayTeamId: "B" };
const KO = { stage: "ROUND_OF_16" as const, homeTeamId: "A", awayTeamId: "B" };

console.log("== 1. provider response parsing ==");
{
  const p = parseFixture(raw({ status: "FT", gh: 2, ga: 1 }));
  check("FT parsed as final", p.isFinal && p.statusShort === "FT");
  check("goals parsed", p.goalsHome === 2 && p.goalsAway === 1);
  check("no penalties flag", p.wentToPenalties === false);

  const pen = parseFixture(raw({ status: "PEN", gh: 1, ga: 1, penH: 4, penA: 3, homeWin: true }));
  check("PEN parsed as final", pen.isFinal);
  check("penalties detected", pen.wentToPenalties === true);
  check("home winner flag read", pen.homeWinner === true);

  const live = parseFixture(raw({ status: "1H", gh: 0, ga: 0 }));
  check("live (1H) NOT final", live.isFinal === false);
  check("FINAL_STATUSES is FT/AET/PEN only", eq([...FINAL_STATUSES].sort(), ["AET", "FT", "PEN"]));
  // Determinism (duplicate sync would derive the same thing → no double count).
  check("parse is deterministic", eq(parseFixture(raw({ status: "FT", gh: 2, ga: 1 })), parseFixture(raw({ status: "FT", gh: 2, ga: 1 }))));
}

console.log("\n== 2. group stage final result scoring ==");
{
  const d = deriveMatchResult(GROUP, parseFixture(raw({ status: "FT", gh: 2, ga: 1 })));
  check("group final → score", d.action === "score");
  check("group has no qualifier", d.result?.winnerTeamId === null);
  const a = { actualHome: 2, actualAway: 1, actualWinnerTeamId: null, isKnockout: false };
  check("exact 2-1 = 3", calculatePredictionPoints({ ...a, predHome: 2, predAway: 1, predWinnerTeamId: null }).points === 3);
  check("outcome 1-0 = 1", calculatePredictionPoints({ ...a, predHome: 1, predAway: 0, predWinnerTeamId: null }).points === 1);
  check("wrong 0-2 = 0", calculatePredictionPoints({ ...a, predHome: 0, predAway: 2, predWinnerTeamId: null }).points === 0);
}

console.log("\n== 3. knockout tied-before-penalties with qualifier ==");
{
  const d = deriveMatchResult(KO, parseFixture(raw({ status: "PEN", gh: 1, ga: 1, penH: 5, penA: 4, homeWin: true })));
  check("knockout PEN → score", d.action === "score");
  check("score stays the draw (1-1)", d.result?.homeScore === 1 && d.result?.awayScore === 1);
  check("penalties recorded", d.result?.wentToPenalties === true);
  check("qualifier = our home team A", d.result?.winnerTeamId === "A");
  const a = { actualHome: 1, actualAway: 1, actualWinnerTeamId: "A", isKnockout: true };
  check("exact draw + right qualifier = 4", calculatePredictionPoints({ ...a, predHome: 1, predAway: 1, predWinnerTeamId: "A" }).points === 4);
  check("exact draw + wrong qualifier = 3", calculatePredictionPoints({ ...a, predHome: 1, predAway: 1, predWinnerTeamId: "B" }).points === 3);
  check("draw outcome + right qualifier = 2", calculatePredictionPoints({ ...a, predHome: 0, predAway: 0, predWinnerTeamId: "A" }).points === 2);
}

console.log("\n== 4. knockout unclear qualifier → review (never guess) ==");
{
  const d = deriveMatchResult(KO, parseFixture(raw({ status: "PEN", gh: 1, ga: 1, penH: null, penA: null, homeWin: null, awayWin: null })));
  check("unclear winner → review (not score)", d.action === "review");
  check("review stores score but no qualifier", d.result?.winnerTeamId === null && d.result?.homeScore === 1);
}

console.log("\n== 5. never score before final / missing data ==");
{
  check("non-final → skip", deriveMatchResult(GROUP, parseFixture(raw({ status: "2H", gh: 1, ga: 0 }))).action === "skip");
  check("postponed (PST) → skip", deriveMatchResult(GROUP, parseFixture(raw({ status: "PST" }))).action === "skip");
  check("final but no goals → skip", deriveMatchResult(GROUP, parseFixture(raw({ status: "FT", gh: null, ga: null }))).action === "skip");
}

console.log("\n== 6. fixture mapping (ambiguous never auto-applied) ==");
{
  const base = (over: Partial<FixtureCandidate>): FixtureCandidate => ({
    fixtureId: "f1", dateISO: "2026-06-15T18:00:00+00:00", homeName: "Brazil", awayName: "Croatia", ...over,
  });
  const match = { kickoffAt: new Date("2026-06-15T18:00:00Z"), homeName: "Brazil", awayName: "Croatia" };

  check("exact 1:1 → mapped", evaluateMapping(match, [base({})]).status === "mapped");
  check("two same-orientation → ambiguous", evaluateMapping(match, [base({ fixtureId: "f1" }), base({ fixtureId: "f2" })]).status === "ambiguous");
  check("reversed orientation only → ambiguous (not mapped)", evaluateMapping(match, [base({ fixtureId: "fR", homeName: "Croatia", awayName: "Brazil" })]).status === "ambiguous");
  check("no candidate near time → unmapped", evaluateMapping(match, [base({ dateISO: "2026-07-01T18:00:00+00:00" })]).status === "unmapped");
  check("alias USA == United States", teamsEqual("USA", "United States"));
  check("alias Korea Republic == South Korea", teamsEqual("Korea Republic", "South Korea"));
  // mapped result carries the right fixture id
  check("mapped returns fixtureId", evaluateMapping(match, [base({ fixtureId: "fX" })]).fixtureId === "fX");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
