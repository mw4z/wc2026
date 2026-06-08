/**
 * End-to-end test against a DEPLOYED instance (Vercel) over HTTPS.
 * Usage:  npx tsx scripts/e2e.ts https://your-app.vercel.app
 *
 * Exercises the full stack incl. the real database:
 *   1. new-user login (creates User)               2. submit prediction on an OPEN match
 *   3. reject prediction on a PAST match (lock)    4. admin login
 *   5. admin enters result (auto-scores)           6. points reflected on /matches
 *   7. leaderboard rebuilt and shows the user
 *
 * Relies on deterministic seed IDs: mtch_1 (open, future) and mtch_101 (past).
 */
export {}; // module scope (avoid global collision with other script files)
const BASE = (process.argv[2] || process.env.BASE_URL || "").replace(/\/$/, "");
if (!BASE) {
  console.error("Provide the deployed URL: npx tsx scripts/e2e.ts https://app.vercel.app");
  process.exit(2);
}

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   - ${name}`); }
  else { fail++; console.log(`  FAIL - ${name} ${detail}`); }
}

function cookieFrom(res: Response): string {
  // getSetCookie() exists on Node's undici Headers but isn't in the DOM lib type.
  const headers = res.headers as unknown as { getSetCookie?: () => string[] };
  const all = headers.getSetCookie?.() ?? [];
  return all.map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  const stamp = Date.now();
  const empId = `e2e_${stamp}`;
  const userName = `E2E Tester ${stamp}`;
  console.log(`Target: ${BASE}\nTest employeeId: ${empId}\n`);

  // 0. health
  let r = await fetch(`${BASE}/login`);
  ok("GET /login reachable (200)", r.status === 200, `got ${r.status}`);

  // 1. new user login
  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: userName, employeeId: empId, department: "QA" }),
  });
  const userJson = await r.json().catch(() => ({}));
  const userCookie = cookieFrom(r);
  ok("new user login (200 + user created)", r.status === 200 && !!userJson?.user?.id, JSON.stringify(userJson));
  ok("session cookie set", userCookie.includes("wc26_session="));

  // 2. submit prediction on OPEN match (mtch_2 — still SCHEDULED/future)
  r = await fetch(`${BASE}/api/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userCookie },
    body: JSON.stringify({ matchId: "mtch_2", predictedHomeScore: 2, predictedAwayScore: 1 }),
  });
  const predJson = await r.json().catch(() => ({}));
  ok("prediction created on open match (200)", r.status === 200 && !!predJson?.prediction?.id, JSON.stringify(predJson));
  ok("prediction not yet scored (pointsAwarded null)", predJson?.prediction?.pointsAwarded == null);

  // 3. reject prediction on PAST match (mtch_101) — server-side lock
  r = await fetch(`${BASE}/api/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userCookie },
    body: JSON.stringify({ matchId: "mtch_101", predictedHomeScore: 1, predictedAwayScore: 0 }),
  });
  const lockJson = await r.json().catch(() => ({}));
  ok("late prediction REJECTED by backend (409)", r.status === 409, `got ${r.status}`);
  // Either code proves a server-side lock: KICKOFF_REACHED (clock) or MATCH_NOT_OPEN
  // (status already auto-locked past kickoff). Both come from lockPredictionGuard.
  ok(
    "rejection is a server-side lock (KICKOFF_REACHED | MATCH_NOT_OPEN)",
    lockJson?.code === "KICKOFF_REACHED" || lockJson?.code === "MATCH_NOT_OPEN",
    JSON.stringify(lockJson),
  );

  // 4. admin login (employeeId 1001 from seed)
  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "admin", employeeId: "1001" }),
  });
  const adminJson = await r.json().catch(() => ({}));
  const adminCookie = cookieFrom(r);
  ok("admin login (role ADMIN)", r.status === 200 && adminJson?.user?.role === "ADMIN", JSON.stringify(adminJson));

  // 5. admin enters result for mtch_2 (2-1 => user's 2-1 is exact => 3 pts)
  r = await fetch(`${BASE}/api/admin/matches/mtch_2/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ homeScore: 2, awayScore: 1 }),
  });
  const resultJson = await r.json().catch(() => ({}));
  ok("admin result accepted + match SCORED (200)", r.status === 200 && resultJson?.match?.status === "SCORED", JSON.stringify(resultJson));

  // 6. points reflected for the user on /matches (LockedView shows "+3 نقطة").
  // Strip React's HTML comment markers that split adjacent text nodes (+ / 3 / نقطة).
  r = await fetch(`${BASE}/matches`, { headers: { Cookie: userCookie } });
  const matchesHtml = (await r.text()).replace(/<!--.*?-->/g, "");
  ok("user's prediction shows +3 نقطة on /matches", /\+\s*3\s*نقطة/.test(matchesHtml), "no +3 found");

  // 7. leaderboard rebuilt and shows the user
  r = await fetch(`${BASE}/leaderboard`, { headers: { Cookie: userCookie } });
  const lbHtml = await r.text();
  ok("leaderboard lists the test user", lbHtml.includes(userName), "name not found on leaderboard");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("E2E crashed:", e);
  process.exit(1);
});
