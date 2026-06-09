// Final pre-launch production smoke test. Usage:
//   npx tsx scripts/launch-smoke.ts https://app.vercel.app
// Creates 2 throwaway users + 1 group + 1 prediction; prints cleanup SQL at the end.
export {};
const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.error("Provide the deployed URL"); process.exit(2); }
const OPEN_MATCH = "mtch_1";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { c ? (pass++, console.log(`  ok   - ${n}`)) : (fail++, console.log(`  FAIL - ${n} ${d}`)); };
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
const POST = (p: string, body: object, cookie = "") =>
  fetch(`${BASE}${p}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
const html = async (p: string, cookie = "") => (await fetch(`${BASE}${p}`, { headers: cookie ? { Cookie: cookie } : {} })).text();
const statusOf = async (p: string, cookie = "") => (await fetch(`${BASE}${p}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" })).status;

async function signup(country: string, phone: string, name: string) {
  const start = await POST("/api/auth/login", { country, phone });
  const startJson = await start.json().catch(() => ({}));
  const pending = cookieFrom(start);
  const su = await POST("/api/auth/signup", { name }, pending);
  return { startStatus: start.status, exists: startJson.exists, signupStatus: su.status, cookie: cookieFrom(su) };
}

async function main() {
  const ts = Date.now();
  const natA = "0555" + String(ts % 1000000).padStart(6, "0");
  const natB = "0555" + String((ts + 137) % 1000000).padStart(6, "0");
  const e164A = "+966" + natA.slice(1);
  const e164B = "+966" + natB.slice(1);
  const groupName = `Launch Grp ${ts}`;
  console.log(`Target: ${BASE}\n`);

  // Public pages (no auth)
  for (const p of ["/", "/rules", "/privacy", "/terms"]) {
    ok(`public ${p} -> 200`, (await statusOf(p)) === 200);
  }

  // New-user signup (A)
  const A = await signup("SA", natA, "Launch A");
  ok("new phone -> signup flow (exists:false)", A.startStatus === 200 && A.exists === false, JSON.stringify(A));
  ok("signup creates account + session", A.signupStatus === 200 && A.cookie.includes("wc26_session="), `signup ${A.signupStatus}`);

  // Existing user login (A) by phone
  const reA = await POST("/api/auth/login", { country: "SA", phone: e164A });
  const reAJson = await reA.json().catch(() => ({}));
  ok("existing phone login -> exists:true", reA.status === 200 && reAJson.exists === true, JSON.stringify(reAJson));

  // Create group (A)
  const gc = await POST("/api/groups", { name: groupName }, A.cookie);
  const gcJson = await gc.json().catch(() => ({}));
  const code: string = gcJson?.group?.code || "";
  ok("create group works", gc.status === 200 && /^CUP-\d{5}$/.test(code), JSON.stringify(gcJson));

  // Second user (B) + join by CUP code (bare digits)
  const B = await signup("SA", natB, "Launch B");
  ok("second user signup", B.signupStatus === 200 && B.cookie.includes("wc26_session="));
  const join = await POST("/api/groups/join", { code: code.replace(/\D/g, "") }, B.cookie);
  const joinJson = await join.json().catch(() => ({}));
  ok("join group by CUP code", join.status === 200 && joinJson.alreadyMember === false, JSON.stringify(joinJson));

  // Submit prediction for an open match (A)
  const pr = await POST("/api/predictions", { matchId: OPEN_MATCH, predictedHomeScore: 2, predictedAwayScore: 1 }, A.cookie);
  const prJson = await pr.json().catch(() => ({}));
  ok("submit prediction on open match (200)", pr.status === 200 && !!prJson?.prediction?.id, `status ${pr.status} ${JSON.stringify(prJson)}`);

  // Prediction-open setting is "always" (admin)
  const admin = cookieFrom(await POST("/api/auth/login", { name: "admin", employeeId: "1001" }));
  const sj = await (await fetch(`${BASE}/api/admin/settings`, { headers: { Cookie: admin } })).json().catch(() => ({}));
  ok('prediction-open setting = "always"', sj.predictionLead === "always", JSON.stringify(sj));

  // Authed pages load
  for (const p of ["/matches", "/groups", "/leaderboard"]) {
    ok(`authed ${p} -> 200`, (await statusOf(p, A.cookie)) === 200);
  }

  // Mobile layout markers (bottom tab bar present on app pages)
  const matchesHtml = await html("/matches", A.cookie);
  ok("/matches renders content (match card link)", matchesHtml.includes("/matches/"), "no match content");
  const groupsHtml = await html("/groups", A.cookie);
  ok("/groups renders content (the test group)", groupsHtml.includes(groupName), "group not shown");

  // Ads disabled
  for (const p of ["/", "/rules"]) {
    const h = await html(p);
    ok(`${p}: ads disabled (no adsense)`, !h.includes("adsbygoogle") && !h.includes("pagead2.googlesyndication.com"));
  }

  // No test-data banner
  ok("no test-data banner on /matches", !matchesHtml.includes("بيانات تجريبية"));

  // Phone numbers not exposed
  ok("phone not on /leaderboard", !(await html("/leaderboard", A.cookie)).includes(e164A));
  ok("phone not on group page", !(await html(`/groups/${gcJson?.group?.id}`, A.cookie)).includes(e164A));
  ok("phone not on group members page", !(await html(`/groups/${gcJson?.group?.id}/members`, A.cookie)).includes(e164A));
  for (const p of ["/", "/rules", "/privacy", "/terms"]) {
    ok(`phone not on public ${p}`, !(await html(p)).includes("+966"));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log("Cleanup SQL:");
  console.log(`  DELETE FROM "Group" WHERE name = '${groupName}';`);
  console.log(`  DELETE FROM "User" WHERE "phoneE164" IN ('${e164A}', '${e164B}');`);
  process.exitCode = fail === 0 ? 0 : 1;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
