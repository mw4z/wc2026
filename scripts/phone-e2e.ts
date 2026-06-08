// Phone-login E2E against a deployed instance (run AFTER 30_phone_login.sql).
// Usage: npx tsx scripts/phone-e2e.ts https://app.vercel.app
export {};

const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.error("Provide the deployed URL"); process.exit(2); }

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   - ${name}`); }
  else { fail++; console.log(`  FAIL - ${name} ${detail}`); }
}
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
async function login(body: object) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, user: j?.user, error: j, cookie: cookieFrom(r) };
}

async function main() {
  const ts = Date.now();
  const national = `0555${String(ts % 1000000).padStart(6, "0")}`; // valid SA mobile, unique per run
  const e164 = `+966${national.slice(1)}`;
  console.log(`Target: ${BASE}\nSA national: ${national} -> expect ${e164}\n`);

  // 1. New SA user
  let r = await login({ name: "Phone User A", country: "SA", phone: national });
  const firstId = r.user?.id;
  ok("new SA user logs in (200)", r.status === 200 && !!firstId, JSON.stringify(r.error));
  ok("login response hides phone", r.user && !("phoneE164" in r.user) && !("employeeId" in r.user));

  // 2. Existing phone (international format) -> same account
  r = await login({ name: "Phone User B", country: "SA", phone: e164 });
  ok("same phone (intl format) -> same user", r.status === 200 && r.user?.id === firstId, `${r.user?.id} vs ${firstId}`);
  // 3. Name not overwritten
  ok("display name not overwritten", r.user?.name === "Phone User A", `got ${r.user?.name}`);

  // 4. Invalid phone rejected
  r = await login({ name: "Bad", country: "SA", phone: "123" });
  ok("invalid phone rejected (422)", r.status === 422 && r.error?.code === "INVALID_PHONE", `got ${r.status}`);

  // 5. Non-Saudi country works (Egypt)
  const egNational = `010${String(ts % 100000000).padStart(8, "0")}`;
  r = await login({ name: "Egypt User", country: "EG", phone: egNational });
  ok("non-Saudi (EG) works (200)", r.status === 200 && !!r.user?.id, `${r.status} ${JSON.stringify(r.error)}`);

  // 6/7. Phone not shown on leaderboard or group pages
  const userCookie = (await login({ name: "Phone User A", country: "SA", phone: national })).cookie;
  const get = async (path: string) =>
    (await fetch(`${BASE}${path}`, { headers: { Cookie: userCookie } })).text();
  let html = await get("/leaderboard");
  ok("phone absent from leaderboard", !html.includes(e164) && !html.includes(national));

  const gc = await fetch(`${BASE}/api/groups`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: userCookie },
    body: JSON.stringify({ name: `Phone Grp ${ts}` }),
  });
  const gid = (await gc.json())?.group?.id;
  if (gid) {
    html = await get(`/groups/${gid}`);
    ok("phone absent from group page", !html.includes(e164) && !html.includes(national));
    html = await get(`/groups/${gid}/members`);
    ok("phone absent from members page", !html.includes(e164) && !html.includes(national));
  } else {
    ok("group created for privacy check", false, "no group id");
  }

  // 8/11. Legacy employeeId login path still works (transition / admin compat)
  r = await login({ name: "Legacy User", employeeId: `legacy_${ts}` });
  ok("legacy employeeId login still works", r.status === 200 && !!r.user?.id, `got ${r.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`(cleanup: DELETE FROM "Group" WHERE name LIKE 'Phone Grp %'; DELETE FROM "User" WHERE "phoneE164" LIKE '+966555%' OR "employeeId" LIKE 'legacy_%';)`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
