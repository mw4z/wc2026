// Live check for Web Push reminders. Waits for the new deploy, then verifies:
// manifest/SW/icon served, cron auth + push-configured, subscribe/unsubscribe API.
// Usage: npx tsx scripts/push-check.ts https://www.gamepredict.net <CRON_SECRET>
export {};
const BASE = (process.argv[2] || "").replace(/\/$/, "");
const SECRET = process.argv[3] || "";
if (!BASE || !SECRET) { console.error("Usage: push-check.ts <url> <CRON_SECRET>"); process.exit(2); }

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { c ? (pass++, console.log(`  ok   - ${n}`)) : (fail++, console.log(`  FAIL - ${n} ${d}`)); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
const POST = (p: string, body: object, cookie = "") =>
  fetch(`${BASE}${p}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });

async function main() {
  console.log(`Target: ${BASE}\n`);

  // Wait for the new deploy: /sw.js exists only after this push lands.
  process.stdout.write("Waiting for deploy");
  let swText = "";
  for (let i = 0; i < 48; i++) {
    const r = await fetch(`${BASE}/sw.js`);
    if (r.status === 200) { swText = await r.text(); break; }
    process.stdout.write(".");
    await sleep(5000);
  }
  console.log("");

  // Static assets
  ok("/sw.js served", swText.includes("showNotification"));
  const man = await fetch(`${BASE}/manifest.webmanifest`);
  ok("/manifest.webmanifest served", man.status === 200 && (await man.text()).includes("توقعات"));
  ok("/icon.svg served", (await fetch(`${BASE}/icon.svg`)).status === 200);

  // Cron auth: no key → 401
  const noKey = await fetch(`${BASE}/api/cron/reminders`, { redirect: "manual" });
  ok("cron rejects missing secret (401)", noKey.status === 401, `status ${noKey.status}`);
  // Cron with wrong key → 401
  const badKey = await fetch(`${BASE}/api/cron/reminders?key=nope`, { redirect: "manual" });
  ok("cron rejects wrong secret (401)", badKey.status === 401, `status ${badKey.status}`);
  // Cron with correct key → 200 JSON, and push IS configured (not skipped)
  const good = await fetch(`${BASE}/api/cron/reminders?key=${encodeURIComponent(SECRET)}`);
  const gjson = await good.json().catch(() => ({}));
  ok("cron accepts correct secret (200)", good.status === 200, `status ${good.status}`);
  ok("VAPID configured on server (cron not skipped)", !("skipped" in gjson), JSON.stringify(gjson));
  console.log("    cron response:", JSON.stringify(gjson));

  // Subscribe API: unauthenticated → 401
  const unauth = await POST("/api/push/subscribe", { endpoint: "https://example.com/x", keys: { p256dh: "a", auth: "b" } });
  ok("subscribe requires auth (401)", unauth.status === 401, `status ${unauth.status}`);

  // Authenticated subscribe with a dummy subscription, then unsubscribe (cleanup).
  const ts = Date.now();
  const emp = "PUSHTEST" + (ts % 100000);
  const login = await POST("/api/auth/login", { name: "Push Diag", employeeId: emp });
  const cookie = cookieFrom(login);
  const fakeEndpoint = `https://fcm.googleapis.com/fcm/send/diag-${ts}`;
  const sub = await POST("/api/push/subscribe", { endpoint: fakeEndpoint, keys: { p256dh: "BdiagP256dhKeyForTestingOnly0000000000000000", auth: "diagAuthSecret00" } }, cookie);
  ok("authenticated subscribe stores subscription (200)", sub.status === 200, `status ${sub.status}`);
  // Invalid body → 422
  const bad = await POST("/api/push/subscribe", { endpoint: "not-a-url" }, cookie);
  ok("subscribe validates body (422)", bad.status === 422, `status ${bad.status}`);
  // Unsubscribe (removes the dummy row)
  const unsub = await POST("/api/push/unsubscribe", { endpoint: fakeEndpoint }, cookie);
  ok("unsubscribe works (200)", unsub.status === 200, `status ${unsub.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log("Created 1 diagnostic user — cleanup SQL:");
  console.log(`  DELETE FROM "PushSubscription" WHERE endpoint = '${fakeEndpoint}';`);
  console.log(`  DELETE FROM "User" WHERE "employeeId" = '${emp}';`);
  process.exitCode = fail === 0 ? 0 : 1;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
