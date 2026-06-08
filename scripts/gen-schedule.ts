// Generates the production schedule review table + idempotent SQL from
// prisma/schedule-data.ts. No DB connection. Run: npx tsx scripts/gen-schedule.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { FIXTURES, VENUE, NAME_TO_CODE, stageForMatch } from "../prisma/schedule-data";

const pad = (n: number) => String(n).padStart(2, "0");
const HOUR = 3600_000;

// BST (UTC+1) wall time -> UTC instant.
function toUtcMs(date: string, bst: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = bst.split(":").map(Number);
  return Date.UTC(y!, mo! - 1, d!, h!, mi!) - HOUR;
}
function fmt(ms: number, withSeconds: boolean): string {
  const d = new Date(ms);
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:00` : base;
}
const codeToId = (code: string) => "team_" + code.toLowerCase();
function teamId(name: string): string | null {
  if (name === "TBD") return null;
  const code = NAME_TO_CODE[name];
  if (!code) throw new Error(`Unmapped team name: "${name}"`);
  return codeToId(code);
}
function venue(city: string): [string, string] {
  const v = VENUE[city];
  if (!v) throw new Error(`Unmapped city: "${city}"`);
  return v;
}

// ---- Assemble rows ----
const rows = FIXTURES.map((f) => {
  const utcMs = toUtcMs(f.date, f.bst);
  const [fifaCity, stadium] = venue(f.city);
  return {
    n: f.n,
    stage: stageForMatch(f.n),
    home: f.h,
    away: f.a,
    homeId: teamId(f.h),
    awayId: teamId(f.a),
    utc: fmt(utcMs, true), // 'YYYY-MM-DD HH:MM:00'
    ksa: fmt(utcMs + 3 * HOUR, false), // KSA display
    city: fifaCity,
    stadium,
  };
});

if (rows.length !== 104) throw new Error(`Expected 104 fixtures, got ${rows.length}`);

// ---- Review table (markdown) ----
const md: string[] = [];
md.push("# WC2026 Production Schedule — Review (generated)\n");
md.push("All `kickoffAtUTC` stored in UTC; `displayKSA` is Asia/Riyadh (UTC+3).");
md.push("Group-stage teams = official draw. Knockout teams = TBD (set by results; stored NULL so predictions stay locked until assigned).\n");
md.push("| # | stage | home | away | kickoffAtUTC | displayKSA | city | stadium |");
md.push("|---|-------|------|------|--------------|-----------|------|---------|");
for (const r of rows) {
  md.push(
    `| ${r.n} | ${r.stage} | ${r.home} | ${r.away} | ${r.utc} | ${r.ksa} | ${r.city} | ${r.stadium} |`,
  );
}
mkdirSync(new URL("../docs/", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/schedule-review.md", import.meta.url), md.join("\n") + "\n", "utf8");

// ---- Production SQL (idempotent) ----
const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const sql: string[] = [];
sql.push("-- WC2026 PRODUCTION SCHEDULE (104 official fixtures). Generated.");
sql.push("-- Run in Supabase SQL Editor. Idempotent: re-running re-syncs schedule");
sql.push("-- metadata (stage/teams/kickoff/venue) WITHOUT touching entered results.");
sql.push("BEGIN;");
sql.push("");
sql.push("-- ===== PRE-LAUNCH TEST CLEANUP — REMOVE THIS BLOCK BEFORE ANY PRODUCTION RE-RUN =====");
sql.push('DELETE FROM "Prediction";');
sql.push('DELETE FROM "PredictionAuditLog";');
sql.push('DELETE FROM "MatchResultAuditLog";');
sql.push('DELETE FROM "LeaderboardEntry";');
sql.push("DELETE FROM \"User\" WHERE \"employeeId\" LIKE 'e2e_%';");
sql.push('UPDATE "Match" SET "status"=\'SCHEDULED\', "homeScore"=NULL, "awayScore"=NULL, "winnerTeamId"=NULL, "resultConfirmedAt"=NULL, "wentToPenalties"=false;');
sql.push('DELETE FROM "Match" WHERE "matchNumber" NOT BETWEEN 1 AND 104;');
sql.push("-- ===== END PRE-LAUNCH CLEANUP =====");
sql.push("");
sql.push("-- Upsert the 104 fixtures (DO UPDATE only re-syncs schedule fields).");
for (const r of rows) {
  const home = r.homeId ? q(r.homeId) : "NULL";
  const away = r.awayId ? q(r.awayId) : "NULL";
  sql.push(
    `INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES (` +
      `${q("mtch_" + r.n)}, ${r.n}, ${q(r.stage)}::"Stage", ${home}, ${away}, ${q(r.utc)}, ${q(r.city)}, ${q(r.stadium)}, 'SCHEDULED', false, now(), now()) ` +
      `ON CONFLICT ("matchNumber") DO UPDATE SET "stage"=EXCLUDED."stage", "homeTeamId"=EXCLUDED."homeTeamId", "awayTeamId"=EXCLUDED."awayTeamId", "kickoffAt"=EXCLUDED."kickoffAt", "city"=EXCLUDED."city", "stadium"=EXCLUDED."stadium", "updatedAt"=now();`,
  );
}
sql.push("");
sql.push("-- Grant ADMIN to employee 302254 (no-op if not yet registered).");
sql.push("-- For first-login auto-promotion also add 302254 to ADMIN_EMPLOYEE_IDS in Vercel.");
sql.push("UPDATE \"User\" SET \"role\"='ADMIN' WHERE \"employeeId\"='302254';");
sql.push("");
sql.push("COMMIT;");
mkdirSync(new URL("../supabase/", import.meta.url), { recursive: true });
writeFileSync(new URL("../supabase/10_schedule.sql", import.meta.url), sql.join("\n") + "\n", "utf8");

// ---- Summary ----
const groups = rows.filter((r) => r.stage === "GROUP").length;
const knockout = rows.length - groups;
const venues = new Set(rows.map((r) => r.stadium));
console.log(`Generated review (docs/schedule-review.md) + SQL (supabase/10_schedule.sql)`);
console.log(`Total: ${rows.length} | Group: ${groups} | Knockout: ${knockout} | Venues: ${venues.size}`);
console.log(`Match 1   : ${rows[0]!.home} v ${rows[0]!.away} | ${rows[0]!.utc}Z | KSA ${rows[0]!.ksa} | ${rows[0]!.stadium}`);
console.log(`Match 104 : ${rows[103]!.stage} | ${rows[103]!.utc}Z | KSA ${rows[103]!.ksa} | ${rows[103]!.stadium}`);
