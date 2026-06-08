// Phase D group-system E2E against a deployed instance (run AFTER 20_groups.sql).
// Usage: npx tsx scripts/groups-e2e.ts https://app.vercel.app
export {};

const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) {
  console.error("Provide the deployed URL");
  process.exit(2);
}

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   - ${name}`); }
  else { fail++; console.log(`  FAIL - ${name} ${detail}`); }
}
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
async function login(employeeId: string, name: string) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, employeeId }),
  });
  const j = await r.json().catch(() => ({}));
  return { cookie: cookieFrom(r), id: j?.user?.id as string, role: j?.user?.role };
}
function jpost(path: string, cookie: string, body: unknown) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

async function main() {
  const ts = Date.now();
  console.log(`Target: ${BASE}\n`);

  const A = await login(`e2e_grpA_${ts}`, "Leader A");
  const B = await login(`e2e_grpB_${ts}`, "Member B");
  const C = await login(`e2e_grpC_${ts}`, "Outsider C");
  ok("3 users logged in", !!A.id && !!B.id && !!C.id);

  // Create group (A becomes leader)
  let r = await jpost("/api/groups", A.cookie, { name: `Test Group ${ts}` });
  const created = await r.json();
  const gid = created?.group?.id as string;
  const code = created?.group?.code as string;
  ok("group created", r.status === 200 && !!gid);
  ok(`code format CUP-XXXXX (${code})`, /^CUP-\d{5}$/.test(code || ""), code);
  const digits = (code || "").replace(/\D/g, "");

  // Leader-only rename: A succeeds, B (member) fails
  r = await fetch(`${BASE}/api/groups/${gid}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: A.cookie },
    body: JSON.stringify({ name: `Renamed ${ts}` }),
  });
  ok("leader can rename (200)", r.status === 200, `got ${r.status}`);

  // B joins with bare digits, then variants -> alreadyMember
  r = await jpost("/api/groups/join", B.cookie, { code: digits });
  let jb = await r.json();
  ok("member joins via 5 digits", r.status === 200 && jb.alreadyMember === false, JSON.stringify(jb));
  r = await jpost("/api/groups/join", B.cookie, { code: `cup${digits}` });
  jb = await r.json();
  ok("re-join via cupXXXXX -> alreadyMember", r.status === 200 && jb.alreadyMember === true);
  r = await jpost("/api/groups/join", B.cookie, { code: `CUP-${digits}` });
  jb = await r.json();
  ok("re-join via CUP-XXXXX -> alreadyMember", r.status === 200 && jb.alreadyMember === true);

  // B (member, non-leader) cannot rename
  r = await fetch(`${BASE}/api/groups/${gid}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: B.cookie },
    body: JSON.stringify({ name: "hack" }),
  });
  ok("non-leader rename rejected (403)", r.status === 403, `got ${r.status}`);

  // Group leaderboard lists members A & B (filtered)
  r = await fetch(`${BASE}/groups/${gid}/leaderboard`, { headers: { Cookie: A.cookie } });
  const lb = (await r.text()).replace(/<!--.*?-->/g, "");
  ok("group leaderboard lists Leader A", lb.includes("Leader A"));
  ok("group leaderboard lists Member B", lb.includes("Member B"));
  ok("group leaderboard excludes outsider C", !lb.includes("Outsider C"));

  // Non-member C cannot view the group
  r = await fetch(`${BASE}/groups/${gid}`, { headers: { Cookie: C.cookie } });
  let html = (await r.text()).replace(/<!--.*?-->/g, "");
  ok("non-member sees access-denied", html.includes("صلاحية الوصول"));

  // Leader removes B
  r = await fetch(`${BASE}/api/groups/${gid}/members/${B.id}`, { method: "DELETE", headers: { Cookie: A.cookie } });
  ok("leader removes member (200)", r.status === 200, `got ${r.status}`);
  r = await fetch(`${BASE}/groups/${gid}`, { headers: { Cookie: B.cookie } });
  html = (await r.text()).replace(/<!--.*?-->/g, "");
  ok("removed member loses access", html.includes("صلاحية الوصول"));

  // Regenerate code: old invalid, new works
  r = await jpost(`/api/groups/${gid}/regenerate`, A.cookie, {});
  const newCode = (await r.json())?.code as string;
  ok("code regenerated & changed", /^CUP-\d{5}$/.test(newCode || "") && newCode !== code, `${code} -> ${newCode}`);
  r = await jpost("/api/groups/join", C.cookie, { code }); // old
  ok("old code no longer works (404)", r.status === 404, `got ${r.status}`);
  r = await jpost("/api/groups/join", C.cookie, { code: newCode }); // new
  ok("new code works (200)", r.status === 200, `got ${r.status}`);

  // Admin deactivate -> cannot join
  const admin = await login("1001", "admin");
  r = await fetch(`${BASE}/api/admin/groups/${gid}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: admin.cookie },
    body: JSON.stringify({ isActive: false }),
  });
  ok("admin deactivates group (200)", r.status === 200, `got ${r.status}`);
  r = await jpost("/api/groups/join", B.cookie, { code: newCode });
  ok("cannot join deactivated group (404)", r.status === 404, `got ${r.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`(cleanup test data: DELETE FROM "Group" WHERE name LIKE 'Renamed %' OR name LIKE 'Test Group %'; then DELETE FROM "User" WHERE "employeeId" LIKE 'e2e_grp%';)`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
