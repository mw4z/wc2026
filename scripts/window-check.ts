// Live behavioral check for the global prediction-open window.
// Usage: npx tsx scripts/window-check.ts https://app.vercel.app
// Restores the original setting in finally. Creates no users/predictions
// (the test submit is REJECTED, so no row is written).
export {};
const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.error("Provide the deployed URL"); process.exit(2); }

const MATCH_ID = "mtch_1"; // Mexico vs South Africa — >24h away on the test date

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { c ? (pass++, console.log(`  ok   - ${n}`)) : (fail++, console.log(`  FAIL - ${n} ${d}`)); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
const J = (path: string, body: object, cookie = "") =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
const PATCH = (body: object, cookie: string) =>
  fetch(`${BASE}/api/admin/settings`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) });
const GETs = (cookie: string) => fetch(`${BASE}/api/admin/settings`, { headers: { Cookie: cookie } });

async function adminLogin() {
  const r = await J("/api/auth/login", { name: "admin", employeeId: "1001" });
  return { status: r.status, cookie: cookieFrom(r) };
}

async function main() {
  console.log(`Target: ${BASE}\n`);

  // Wait for b13a69a: GET /api/admin/settings returns 200 (admin) and includes
  // `predictionLead` (new field). Admin is verified by the settings endpoint
  // itself, not the login response (legacy login returns {exists:true}).
  let cookie = "";
  let ready = false;
  process.stdout.write("Waiting for deploy");
  for (let i = 0; i < 30; i++) {
    const a = await adminLogin();
    if (a.status !== 200) {
      console.log(`\nAdmin login HTTP ${a.status}. Is employee 1001 active? Aborting; nothing changed.`);
      process.exitCode = 1;
      return;
    }
    cookie = a.cookie;
    const s = await GETs(cookie);
    if (s.status === 401 || s.status === 403) {
      console.log(`\n/api/admin/settings -> ${s.status}: employee 1001 is not an active ADMIN. Aborting; nothing changed.`);
      process.exitCode = 1;
      return;
    }
    const j = await s.json().catch(() => ({}));
    if (s.status === 200 && "predictionLead" in j) { ready = true; break; }
    process.stdout.write(".");
    await sleep(5000);
  }
  console.log(ready ? " ready\n" : " timeout\n");

  const original = (await (await GETs(cookie)).json()).predictionLead as string;
  console.log(`Original prediction-open setting: ${original}\n`);

  let changed = false;
  try {
    // 2) set to 24h
    const set = await PATCH({ predictionLead: "24" }, cookie);
    const setJson = await set.json().catch(() => ({}));
    changed = true;
    ok("set prediction window = 24h", set.status === 200 && setJson.predictionLead === "24", JSON.stringify(setJson));

    // 4/5) attempt a prediction on a >24h match -> rejected, no row created
    const r = await J("/api/predictions", { matchId: MATCH_ID, predictedHomeScore: 1, predictedAwayScore: 0 }, cookie);
    const body = await r.json().catch(() => ({}));
    ok("backend rejects prediction (409)", r.status === 409, `status ${r.status} ${JSON.stringify(body)}`);
    ok("code = PREDICTION_NOT_OPEN_YET", body.code === "PREDICTION_NOT_OPEN_YET", JSON.stringify(body));

    // 6) /matches shows the not-yet-open state
    const html = await (await fetch(`${BASE}/matches`, { headers: { Cookie: cookie } })).text();
    ok("/matches shows not-yet-open UI", html.includes("لم يفتح التوقع بعد"), "not-open text missing");
  } finally {
    // 7) restore original
    if (changed) {
      await PATCH({ predictionLead: original }, cookie);
    }
    const finalVal = (await (await GETs(cookie)).json().catch(() => ({}))).predictionLead;
    console.log(`\nRestored prediction-open setting to: ${finalVal}`);
    console.log(`${pass} passed, ${fail} failed`);
    console.log("(no test users/predictions created — the test submit was rejected)");
    process.exitCode = fail === 0 && finalVal === original ? 0 : 1;
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
