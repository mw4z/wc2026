// 2-page auth flow E2E against a deployed instance.
// Usage: npx tsx scripts/auth2-e2e.ts https://app.vercel.app
export {};
const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.error("Provide the deployed URL"); process.exit(2); }

let pass = 0, fail = 0;
function ok(n: string, c: boolean, d = "") { c ? (pass++, console.log(`  ok   - ${n}`)) : (fail++, console.log(`  FAIL - ${n} ${d}`)); }
function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
const J = (path: string, body: object, cookie = "") =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });

async function main() {
  const ts = Date.now();
  const national = `0555${String(ts % 1000000).padStart(6, "0")}`;
  console.log(`Target: ${BASE}\nPhone: ${national}\n`);

  // 1. New phone -> exists:false + pending cookie (no account yet)
  let r = await J("/api/auth/login", { country: "SA", phone: national });
  let body = await r.json().catch(() => ({}));
  const pending = cookieFrom(r);
  ok("new phone -> exists:false", r.status === 200 && body.exists === false, JSON.stringify(body));
  ok("pending cookie set", pending.includes("wc26_pending="));

  // 2. Signup without pending cookie -> 401
  r = await J("/api/auth/signup", { name: "No Pending" });
  ok("signup without pending -> 401", r.status === 401);

  // 3. Signup with invalid group code -> error, NO account, pending kept
  r = await J("/api/auth/signup", { name: "Tester", groupCode: "99999" }, pending);
  ok("invalid group code rejected", r.status === 404 || r.status === 422, `got ${r.status}`);

  // 4. Signup (no group) with pending -> creates account + session
  r = await J("/api/auth/signup", { name: "Tester A", groupCode: "" }, pending);
  body = await r.json().catch(() => ({}));
  const session = cookieFrom(r);
  ok("signup creates account (200)", r.status === 200 && body.ok === true, JSON.stringify(body));
  ok("session cookie set after signup", session.includes("wc26_session="));

  // 5. Same phone now logs in directly (exists:true)
  r = await J("/api/auth/login", { country: "SA", phone: national });
  body = await r.json().catch(() => ({}));
  ok("returning phone -> exists:true", r.status === 200 && body.exists === true, JSON.stringify(body));

  // 6. Intl format of same phone -> still exists (normalization)
  r = await J("/api/auth/login", { country: "SA", phone: `+966${national.slice(1)}` });
  body = await r.json().catch(() => ({}));
  ok("intl format -> same account exists", r.status === 200 && body.exists === true);

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`(cleanup: DELETE FROM "User" WHERE "phoneE164" LIKE '+966555%';)`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
