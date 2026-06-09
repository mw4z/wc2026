// Live check for the retention UX. Creates 1 throwaway user + 1 group + 1
// prediction; prints cleanup SQL. Usage: npx tsx scripts/retention-check.ts <url>
export {};
const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.error("Provide the deployed URL"); process.exit(2); }

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { c ? (pass++, console.log(`  ok   - ${n}`)) : (fail++, console.log(`  FAIL - ${n} ${d}`)); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
const POST = (p: string, body: object, cookie = "") =>
  fetch(`${BASE}${p}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
const htmlOf = async (p: string, cookie = "") => (await fetch(`${BASE}${p}`, { headers: cookie ? { Cookie: cookie } : {} })).text();
const status = async (p: string, cookie = "") => (await fetch(`${BASE}${p}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" })).status;

async function main() {
  const ts = Date.now();
  const nat = "0555" + String(ts % 1000000).padStart(6, "0");
  const e164 = "+966" + nat.slice(1);
  const groupName = `Retention Grp ${ts}`;
  console.log(`Target: ${BASE}\n`);

  // Signup user A
  const start = await POST("/api/auth/login", { country: "SA", phone: nat });
  const pending = cookieFrom(start);
  const su = await POST("/api/auth/signup", { name: "Retention A" }, pending);
  const cookie = cookieFrom(su);
  ok("signup + login works", su.status === 200 && cookie.includes("wc26_session="));

  // Create group
  const gc = await POST("/api/groups", { name: groupName }, cookie);
  const gj = await gc.json().catch(() => ({}));
  const code: string = gj?.group?.code || "";
  const gid: string = gj?.group?.id || "";
  ok("create group", gc.status === 200 && /^CUP-\d{5}$/.test(code));

  // Wait for b954f4e: dashboard contains the reminder button label.
  process.stdout.write("Waiting for deploy");
  let dash = "";
  for (let i = 0; i < 30; i++) {
    dash = await htmlOf(`/groups/${gid}`, cookie);
    if (dash.includes("نسخ تذكير المجموعة")) break;
    process.stdout.write(".");
    await sleep(5000);
  }
  console.log("");

  // --- Group dashboard ---
  ok("reminder button present", dash.includes("نسخ تذكير المجموعة"));
  ok("share-result hidden at 0 points", !dash.includes("مشاركة نتيجتي"));
  ok("standings CTA present", dash.includes("تم تحديث الترتيب بعد آخر النتائج"));
  ok("CTA links to group leaderboard", dash.includes(`/groups/${gid}/leaderboard`));
  ok("group code shown on dashboard", dash.includes(code));
  ok("no phone on dashboard", !dash.includes(e164));

  // Invite link valid (code resolves; member re-join is idempotent)
  const rejoin = await POST("/api/groups/join", { code: code.replace(/\D/g, "") }, cookie);
  const rejoinJson = await rejoin.json().catch(() => ({}));
  ok("invite code valid (re-join ok)", rejoin.status === 200 && rejoinJson.alreadyMember === true);
  ok("/join/<code> page reachable", (await status(`/join/${code}`, cookie)) === 200);

  // Group leaderboard loads, no phone
  const lb = await htmlOf(`/groups/${gid}/leaderboard`, cookie);
  ok("group leaderboard loads", lb.length > 0 && (await status(`/groups/${gid}/leaderboard`, cookie)) === 200);
  ok("no phone on group leaderboard", !lb.includes(e164));

  // --- /matches ---
  const matches = await htmlOf("/matches", cookie);
  ok("/matches loads", matches.includes("/matches/"));
  ok("ads disabled on /matches", !matches.includes("adsbygoogle") && !matches.includes("pagead2.googlesyndication.com"));
  ok("no phone on /matches", !matches.includes(e164));
  // Test date is pre-tournament: no matches today and none within 6h, so both
  // sections are intentionally hidden.
  ok("today summary hidden (no matches today) [expected pre-tournament]", !matches.includes("توقعت"));
  ok("closing-soon hidden (none within 6h) [expected pre-tournament]", !matches.includes("توقعات تُغلق قريبًا"));

  // Prediction form path still works (open match, lead=always)
  const pr = await POST("/api/predictions", { matchId: "mtch_1", predictedHomeScore: 2, predictedAwayScore: 1 }, cookie);
  ok("prediction submit works on open match", pr.status === 200, `status ${pr.status}`);

  // Public ads still off
  ok("ads disabled on public /", !(await htmlOf("/")).includes("adsbygoogle"));

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log("Created test data — cleanup SQL:");
  console.log(`  DELETE FROM "Group" WHERE name = '${groupName}';`);
  console.log(`  DELETE FROM "User" WHERE "phoneE164" = '${e164}';`);
  process.exitCode = fail === 0 ? 0 : 1;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
