// Diagnostic: why do /admin and /profile fail? Probes the live app.
// Usage: npx tsx scripts/diag.ts https://app.vercel.app
export {}; // module scope (avoid global collision with other script files)
const BASE = (process.argv[2] || "").replace(/\/$/, "");

function cookieFrom(res: Response): string {
  const h = res.headers as unknown as { getSetCookie?: () => string[] };
  return (h.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
async function probe(label: string, path: string, cookie: string) {
  const res = await fetch(BASE + path, { headers: { Cookie: cookie }, redirect: "manual" });
  let kind = "ok";
  const body = res.status < 400 && res.status !== 307 ? await res.text() : "";
  if (res.status >= 500 || /Application error|Internal Server Error/i.test(body)) kind = "ERROR";
  else if (res.status === 307 || res.status === 302) kind = `redirect -> ${res.headers.get("location")}`;
  console.log(`  ${label} ${path}: ${res.status} (${kind})`);
}

async function login(employeeId: string, name: string) {
  const r = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, employeeId }),
  });
  const j = await r.json().catch(() => ({}));
  return { cookie: cookieFrom(r), role: j?.user?.role, status: r.status };
}

async function main() {
  console.log(`Target: ${BASE}\n`);

  const admin = await login("1001", "admin");
  console.log(`admin 1001 login: ${admin.status}, role=${admin.role}`);
  await probe("admin", "/admin", admin.cookie);
  await probe("admin", "/profile", admin.cookie);

  const user = await login("diag_probe", "Diag Probe");
  console.log(`\nprobe user login: ${user.status}, role=${user.role}`);
  await probe("user", "/admin", user.cookie);
  await probe("user", "/profile", user.cookie);
  await probe("user", "/matches", user.cookie);
}
main().catch((e) => console.error(e));
