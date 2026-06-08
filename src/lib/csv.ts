import { prisma } from "./prisma";
import { matchUpsertSchema, stageEnum } from "./validation";
import { z } from "zod";

// Minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas).
// Sufficient for the admin match-import use case; no external dependency.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const REQUIRED_HEADERS = [
  "match_number",
  "stage",
  "home_team_code",
  "away_team_code",
  "kickoff_at",
  "city",
  "stadium",
];

/**
 * Import matches from CSV text. Upserts by match_number, matches teams by code
 * (TBD allowed → null team). Returns a per-row summary; bad rows are skipped,
 * not fatal.
 */
export async function importMatchesCsv(text: string): Promise<ImportSummary> {
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
  const rows = parseCsv(text);
  if (rows.length === 0) {
    summary.errors.push({ row: 0, message: "ملف فارغ" });
    return summary;
  }

  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length) {
    summary.errors.push({ row: 1, message: `أعمدة ناقصة: ${missing.join(", ")}` });
    return summary;
  }
  const col = (name: string) => header.indexOf(name);

  // Cache team codes once.
  const teams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamByCode = new Map(teams.map((t) => [t.code.toUpperCase(), t.id]));

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]!;
    const get = (name: string) => (cells[col(name)] ?? "").trim();
    try {
      const parsed = matchUpsertSchema.parse({
        matchNumber: get("match_number"),
        stage: get("stage").toUpperCase(),
        homeTeamCode: get("home_team_code"),
        awayTeamCode: get("away_team_code"),
        kickoffAt: get("kickoff_at"),
        city: get("city"),
        stadium: get("stadium"),
      });

      const resolve = (code: string): string | null => {
        const up = code.toUpperCase();
        if (up === "TBD" || up === "") return null;
        const id = teamByCode.get(up);
        if (!id) throw new Error(`فريق غير معروف: ${code}`);
        return id;
      };

      const homeTeamId = resolve(parsed.homeTeamCode);
      const awayTeamId = resolve(parsed.awayTeamCode);

      const existing = await prisma.match.findUnique({
        where: { matchNumber: parsed.matchNumber },
      });

      const data = {
        stage: parsed.stage,
        homeTeamId,
        awayTeamId,
        kickoffAt: new Date(parsed.kickoffAt),
        city: parsed.city || null,
        stadium: parsed.stadium || null,
      };

      if (existing) {
        // Don't silently move a match that already has a result.
        if (existing.status === "SCORED" || existing.status === "FINISHED") {
          summary.skipped++;
          summary.errors.push({
            row: i + 1,
            message: `المباراة ${parsed.matchNumber} انتهت ولم يتم تعديلها`,
          });
          continue;
        }
        await prisma.match.update({ where: { id: existing.id }, data });
        summary.updated++;
      } else {
        await prisma.match.create({ data: { matchNumber: parsed.matchNumber, ...data } });
        summary.created++;
      }
    } catch (e) {
      summary.skipped++;
      const msg =
        e instanceof z.ZodError
          ? e.issues.map((x) => x.message).join("؛ ")
          : e instanceof Error
            ? e.message
            : "خطأ غير معروف";
      summary.errors.push({ row: i + 1, message: msg });
    }
  }

  return summary;
}

export { stageEnum };
