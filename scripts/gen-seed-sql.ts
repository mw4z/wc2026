/**
 * Generates supabase/02_seed.sql from the shared seed data + sample CSV.
 * Pure file generation — no database connection required (safe to run on the
 * firewalled laptop). Paste the output into the Supabase SQL Editor once.
 *
 * Conventions for raw SQL (Prisma's cuid()/@updatedAt are client-side, so we
 * supply explicit ids + timestamps):
 *   team id  = team_<lowercasecode>      match id = mtch_<matchNumber>
 *   admin id = usr_admin1001
 * kickoffAt is written as a naive UTC timestamp (column is timestamp(3), which
 * Prisma reads back as UTC) — same instant as the CSV's ...Z value.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { TEAMS, flagUrlForIso } from "../prisma/seed-data";

const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const teamId = (code: string) => "team_" + code.toLowerCase();
const utc = (iso: string) => q(iso.replace("T", " ").replace("Z", "").trim()); // -> 'YYYY-MM-DD HH:MM:SS'

const lines: string[] = [];
lines.push("-- WC2026 seed data (generated). Run AFTER 01_schema.sql.");
lines.push("-- Idempotent: re-running is a no-op (ON CONFLICT DO NOTHING).");
lines.push("BEGIN;");
lines.push("");

// Teams
lines.push("-- Teams (48) + TBD placeholder");
for (const t of TEAMS) {
  lines.push(
    `INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","flagUrl","createdAt","updatedAt") VALUES (` +
      `${q(teamId(t.code))}, ${q(t.code)}, ${q(t.nameEn)}, ${q(t.nameAr)}, ${q(t.group)}, ${q(flagUrlForIso(t.iso))}, now(), now()) ` +
      `ON CONFLICT ("code") DO UPDATE SET "nameEn"=EXCLUDED."nameEn", "nameAr"=EXCLUDED."nameAr", "groupName"=EXCLUDED."groupName", "flagUrl"=EXCLUDED."flagUrl";`,
  );
}
lines.push(
  `INSERT INTO "Team" ("id","code","nameEn","nameAr","createdAt","updatedAt") VALUES (` +
    `${q("team_tbd")}, 'TBD', 'TBD', 'يُحدد لاحقًا', now(), now()) ON CONFLICT ("code") DO UPDATE SET "nameAr"=EXCLUDED."nameAr";`,
);
lines.push("");

// Admin user
lines.push("-- Bootstrap admin (employeeId 1001)");
lines.push(
  `INSERT INTO "User" ("id","employeeId","name","department","role","isActive","createdAt","updatedAt") VALUES (` +
    `${q("usr_admin1001")}, '1001', 'مدير النظام', 'تقنية المعلومات', 'ADMIN', true, now(), now()) ` +
    `ON CONFLICT ("employeeId") DO UPDATE SET "name"=EXCLUDED."name", "department"=EXCLUDED."department";`,
);
lines.push("");

// Setting
lines.push("-- Default setting");
lines.push(
  `INSERT INTO "Setting" ("key","value","updatedAt") VALUES ('registration_open','true', now()) ` +
    `ON CONFLICT ("key") DO NOTHING;`,
);
lines.push("");

// Sample matches from CSV
lines.push("-- Sample matches (opening fixtures only — NOT the full 104 schedule)");
const csv = readFileSync(new URL("../data/matches.sample.csv", import.meta.url), "utf8");
const rows = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
const header = rows[0]!.split(",");
const idx = (name: string) => header.indexOf(name);
for (let i = 1; i < rows.length; i++) {
  const c = rows[i]!.split(",");
  const num = c[idx("match_number")]!.trim();
  const stage = c[idx("stage")]!.trim();
  const home = teamId(c[idx("home_team_code")]!.trim());
  const away = teamId(c[idx("away_team_code")]!.trim());
  const kickoff = utc(c[idx("kickoff_at")]!.trim());
  const city = c[idx("city")]!.trim();
  const stadium = c[idx("stadium")]!.trim();
  lines.push(
    `INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES (` +
      `${q("mtch_" + num)}, ${num}, ${q(stage)}::"Stage", ${q(home)}, ${q(away)}, ${kickoff}, ${q(city)}, ${q(stadium)}, 'SCHEDULED', false, now(), now()) ` +
      `ON CONFLICT ("matchNumber") DO NOTHING;`,
  );
}
lines.push("");

// One PAST-dated match purely to verify the server-side kickoff lock in E2E.
lines.push("-- Lock-test fixture: kickoff already in the past (delete after testing).");
lines.push(
  `INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES (` +
    `${q("mtch_101")}, 101, 'GROUP'::"Stage", ${q(teamId("KOR"))}, ${q(teamId("CZE"))}, '2026-06-01 12:00:00', 'Test', 'Lock Test', 'SCHEDULED', false, now(), now()) ` +
    `ON CONFLICT ("matchNumber") DO NOTHING;`,
);
lines.push("");
lines.push("COMMIT;");
lines.push("");

mkdirSync(new URL("../supabase/", import.meta.url), { recursive: true });
const outUrl = new URL("../supabase/02_seed.sql", import.meta.url);
writeFileSync(outUrl, lines.join("\n"), "utf8");
console.log(`Wrote ${outUrl.pathname}`);
console.log(`Teams: ${TEAMS.length} + TBD | Matches: ${rows.length - 1} sample + 1 lock-test`);
