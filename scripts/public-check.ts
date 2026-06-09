// Live verification of public pages + ads-disabled state. Read-only (no writes).
// Usage: npx tsx scripts/public-check.ts https://app.vercel.app
export {};
const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.error("Provide the deployed URL"); process.exit(2); }

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { c ? (pass++, console.log(`  ok   - ${n}`)) : (fail++, console.log(`  FAIL - ${n} ${d}`)); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const get = (path: string) => fetch(`${BASE}${path}`, { redirect: "manual" });

async function main() {
  // Wait for the new deploy: /about only exists in 7741bf2+.
  process.stdout.write("Waiting for deploy (polling /about)");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { if ((await get("/about")).status === 200) { ready = true; break; } } catch {}
    process.stdout.write(".");
    await sleep(5000);
  }
  console.log(ready ? " ready\n" : " timeout (continuing anyway)\n");

  // 1) Public pages return 200 and do NOT redirect to /login
  const publicPaths = ["/", "/about", "/rules", "/faq", "/privacy", "/terms", "/contact", "/ads.txt"];
  for (const p of publicPaths) {
    const r = await get(p);
    const loc = r.headers.get("location") || "";
    ok(`GET ${p} -> 200 (no login redirect)`, r.status === 200 && !loc.includes("/login"), `status ${r.status} loc ${loc}`);
  }

  // 2) /login works
  ok("GET /login -> 200", (await get("/login")).status === 200);

  // 3) /matches requires auth (redirects to /login)
  let r = await get("/matches");
  ok("GET /matches (no auth) -> redirect to /login", (r.status === 307 || r.status === 308) && (r.headers.get("location") || "").includes("/login"), `status ${r.status}`);

  // 4) leaderboard & groups are NOT public (so user data never exposed unauthenticated)
  for (const p of ["/leaderboard", "/groups"]) {
    r = await get(p);
    ok(`GET ${p} (no auth) -> redirect to /login`, (r.status === 307 || r.status === 308) && (r.headers.get("location") || "").includes("/login"), `status ${r.status}`);
  }

  // 5/6) AdSense script + ad containers absent while ads disabled (check a few public pages)
  for (const p of ["/", "/rules", "/faq"]) {
    const html = await (await fetch(`${BASE}${p}`)).text();
    ok(`${p}: no AdSense script`, !html.includes("pagead2.googlesyndication.com") && !html.includes("adsbygoogle"), "found adsense");
    ok(`${p}: no ad container`, !html.includes("data-ad-client"), "found ad container");
  }

  // 7) Phone numbers not exposed on public pages
  for (const p of ["/", "/about", "/rules", "/faq", "/privacy", "/terms", "/contact"]) {
    const html = await (await fetch(`${BASE}${p}`)).text();
    ok(`${p}: no phone number leaked`, !/\+9665\d{6,}/.test(html) && !/\b05\d{8}\b/.test(html), "phone-like string found");
  }

  // 8) /rules shows the latest scoring copy
  const rules = (await (await fetch(`${BASE}/rules`)).text()).replace(/<!--.*?-->/g, "");
  ok("/rules has clarified KO copy", rules.includes("توقّع الفائز أو التعادل قبل ركلات الترجيح"));
  ok("/rules has clarified tie-break copy", rules.includes("عدد توقعات الفائز/التعادل الصحيحة الأكثر"));

  // 9) ads.txt reachable + format
  const adstxt = await (await fetch(`${BASE}/ads.txt`)).text();
  ok("/ads.txt reachable with google.com pub line", adstxt.includes("google.com, pub-"));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
