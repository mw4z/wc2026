import { calculatePredictionPoints } from "../src/lib/scoring";
import { parseCsv } from "../src/lib/csv";
import { normalizeGroupCode } from "../src/lib/groups";
import { readFileSync } from "node:fs";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ok  -", name); }
  else { fail++; console.log("  FAIL-", name); }
}

console.log("== scoring ==");
// Group: exact
let r = calculatePredictionPoints({ isKnockout: false, actualHome: 2, actualAway: 1, actualWinnerTeamId: null, predHome: 2, predAway: 1, predWinnerTeamId: null });
check("group exact = 3", r.points === 3 && r.isExactScore);
// Group: outcome only
r = calculatePredictionPoints({ isKnockout: false, actualHome: 2, actualAway: 1, actualWinnerTeamId: null, predHome: 3, predAway: 0, predWinnerTeamId: null });
check("group outcome = 1", r.points === 1 && !r.isExactScore && r.isCorrectOutcome);
// Group: wrong
r = calculatePredictionPoints({ isKnockout: false, actualHome: 2, actualAway: 1, actualWinnerTeamId: null, predHome: 0, predAway: 1, predWinnerTeamId: null });
check("group wrong = 0", r.points === 0);
// Knockout: exact + correct qualifier => 4 (clamp)
r = calculatePredictionPoints({ isKnockout: true, actualHome: 1, actualAway: 1, actualWinnerTeamId: "A", predHome: 1, predAway: 1, predWinnerTeamId: "A" });
check("knockout exact+qualifier = 4 (max)", r.points === 4 && r.isCorrectQualifier);
// Knockout: draw score with qualifier, wrong qualifier => outcome 1 only
r = calculatePredictionPoints({ isKnockout: true, actualHome: 1, actualAway: 1, actualWinnerTeamId: "A", predHome: 0, predAway: 0, predWinnerTeamId: "B" });
check("knockout outcome only (wrong qualifier) = 1", r.points === 1 && !r.isCorrectQualifier);
// Idempotency: same inputs => same output across repeated calls
const args = { isKnockout: true, actualHome: 2, actualAway: 0, actualWinnerTeamId: "A", predHome: 2, predAway: 0, predWinnerTeamId: "A" } as const;
const r1 = calculatePredictionPoints(args);
const r2 = calculatePredictionPoints(args);
check("idempotent (same in => same out)", JSON.stringify(r1) === JSON.stringify(r2) && r1.points === 4);

console.log("== csv parser ==");
const csv = readFileSync(new URL("../data/matches.sample.csv", import.meta.url), "utf8");
const rows = parseCsv(csv);
check("sample header parsed", rows[0]?.[0] === "match_number" && rows[0]?.length === 7);
check("sample has 10 data rows", rows.length === 11);
check("row 1 = match #1 MEX/RSA UTC", rows[1]?.[2] === "MEX" && rows[1]?.[4] === "2026-06-11T19:00:00Z");

console.log("== group code normalization ==");
check("CUP-48291 -> CUP-48291", normalizeGroupCode("CUP-48291") === "CUP-48291");
check("cup48291 -> CUP-48291", normalizeGroupCode("cup48291") === "CUP-48291");
check("CUP 48291 -> CUP-48291", normalizeGroupCode("CUP 48291") === "CUP-48291");
check("48291 -> CUP-48291", normalizeGroupCode("48291") === "CUP-48291");
check("leading zeros 00042 -> CUP-00042", normalizeGroupCode("cup-00042") === "CUP-00042");
check("too short -> null", normalizeGroupCode("123") === null);
check("too long -> null", normalizeGroupCode("123456") === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
