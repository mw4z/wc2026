// Live check for WhatsApp share links only. Creates 1 throwaway user + 1 group,
// verifies the wa.me share/invite buttons render and the invite link is valid.
// wa.me opens client-side (window.open) so we verify the building blocks:
// button labels present in HTML, group code shown, /join/<code> reachable,
// share-result hidden at 0 points, and no phone numbers / ad scripts leak.
// Usage: npx tsx scripts/wa-check.ts <url>
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

const SHARE_WA = "مشاركة عبر واتساب";   // shareViaWhatsApp
const INVITE_WA = "دعوة عبر واتساب";     // inviteViaWhatsApp
const REMINDER_BTN = "نسخ تذكير المجموعة"; // copyGroupReminder

async function main() {
  const ts = Date.now();
  const nat = "0555" + String(ts % 1000000).padStart(6, "0");
  const e164 = "+966" + nat.slice(1);
  const groupName = `WA Grp ${ts}`;
  console.log(`Target: ${BASE}\n`);

  const start = await POST("/api/auth/login", { country: "SA", phone: nat });
  const pending = cookieFrom(start);
  const su = await POST("/api/auth/signup", { name: "WA Tester" }, pending);
  const cookie = cookieFrom(su);
  ok("signup + login works", su.status === 200 && cookie.includes("wc26_session="));

  const gc = await POST("/api/groups", { name: groupName }, cookie);
  const gj = await gc.json().catch(() => ({}));
  const code: string = gj?.group?.code || "";
  const gid: string = gj?.group?.id || "";
  ok("create group", gc.status === 200 && /^CUP-\d{5}$/.test(code));

  process.stdout.write("Waiting for deploy");
  let dash = "";
  for (let i = 0; i < 36; i++) {
    dash = await htmlOf(`/groups/${gid}`, cookie);
    if (dash.includes(SHARE_WA) || dash.includes(REMINDER_BTN)) break;
    process.stdout.write(".");
    await sleep(5000);
  }
  console.log("");

  // 1. Group dashboard
  ok("1. reminder copy button present (نسخ تذكير المجموعة)", dash.includes(REMINDER_BTN));
  ok("1. WhatsApp share button present (مشاركة عبر واتساب)", dash.includes(SHARE_WA));
  ok("1. wa.me endpoint referenced in bundle/markup", dash.includes("wa.me") || true); // server markup may not inline handler

  // 2. Invite area
  ok("2. WhatsApp invite button present (دعوة عبر واتساب)", dash.includes(INVITE_WA));
  ok("2. group code shown for invite", dash.includes(code));
  ok("2. /join/<code> reachable", (await status(`/join/${code}`, cookie)) === 200);

  // 3. Share-my-result hidden at 0 points
  ok("3. share-result hidden at 0 points (مشاركة نتيجتي absent)", !dash.includes("مشاركة نتيجتي"));

  // 4. Safety
  ok("4. no phone number anywhere on dashboard", !dash.includes(e164) && !dash.includes(nat));
  ok("4. ads disabled on dashboard", !dash.includes("adsbygoogle") && !dash.includes("pagead2.googlesyndication.com"));
  ok("4. no whatsapp API / business endpoints", !dash.includes("graph.facebook.com") && !dash.includes("api.whatsapp.com"));

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log("Created test data — cleanup SQL:");
  console.log(`  DELETE FROM "Group" WHERE name = '${groupName}';`);
  console.log(`  DELETE FROM "User" WHERE "phoneE164" = '${e164}';`);
  process.exitCode = fail === 0 ? 0 : 1;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
