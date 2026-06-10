import { prisma } from "./prisma";
import { calculateMatchPoints } from "./matches";
import { fetchAllFixtures, footballApiConfigured, footballProvider, rateLimitRemaining } from "./footballApi";
import { deriveMatchResult, orientToMatch, type ParsedFixture } from "./resultSyncCore";
import { evaluateMapping } from "./fixtureMapping";

// Re-export the pure layer so existing import sites keep working.
export * from "./resultSyncCore";

// ---------------------------------------------------------------------------
// ORCHESTRATION (DB + provider). Reuses calculateMatchPoints for scoring — the
// scoring rules, locking, predictions, and leaderboard logic are untouched.
// ---------------------------------------------------------------------------

const STARTING_SOON_MS = 5 * 60_000;
const MAX_PER_RUN = 120;

export interface SyncReport {
  provider: string;
  checked: number;
  scored: number;
  review: number;
  skipped: number;
  missingFromProvider: number;
  errors: number;
  truncated: boolean;
  rateLimitRemaining: number | null;
  skippedReason?: string;
}

/**
 * Fetch results and score the finished ones.
 * @param opts.matchIds  restrict to these matches (admin single-match sync)
 * @param opts.force     re-sync even already-SCORED / needs-review matches (admin)
 */
export async function syncResults(opts: { matchIds?: string[]; force?: boolean } = {}): Promise<SyncReport> {
  const report: SyncReport = {
    provider: footballProvider,
    checked: 0,
    scored: 0,
    review: 0,
    skipped: 0,
    missingFromProvider: 0,
    errors: 0,
    truncated: false,
    rateLimitRemaining: null,
  };

  if (!footballApiConfigured) return { ...report, skippedReason: "provider not configured" };

  const now = new Date();
  const candidates = await prisma.match.findMany({
    where: opts.force
      ? { externalFixtureId: { not: null }, ...(opts.matchIds ? { id: { in: opts.matchIds } } : {}) }
      : {
          externalFixtureId: { not: null },
          status: { notIn: ["SCORED"] },
          needsReview: false,
          kickoffAt: { lte: new Date(now.getTime() + STARTING_SOON_MS) },
          ...(opts.matchIds ? { id: { in: opts.matchIds } } : {}),
        },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: "asc" },
  });
  if (candidates.length === 0) return report;

  const limited = candidates.slice(0, MAX_PER_RUN);
  report.truncated = candidates.length > limited.length;

  // One provider call returns every fixture; index by provider fixture id.
  let byId: Map<string, ParsedFixture>;
  try {
    const all = await fetchAllFixtures();
    byId = new Map(all.map((f) => [f.fixtureId, f]));
  } catch (e) {
    console.error("[result-sync] provider fetch failed:", (e as Error).message);
    return { ...report, errors: 1, rateLimitRemaining: rateLimitRemaining() };
  }

  for (const match of limited) {
    report.checked++;
    const raw = byId.get(match.externalFixtureId!);
    if (!raw) {
      report.missingFromProvider++;
      continue;
    }
    try {
      // Not over yet → record we checked, change nothing.
      if (!raw.isFinal) {
        await prisma.match.update({
          where: { id: match.id },
          data: { lastSyncedAt: now, externalStatus: raw.statusRaw, externalProvider: footballProvider },
        });
        report.skipped++;
        continue;
      }

      // Align provider home/away to OUR schedule so scores map correctly.
      if (!match.homeTeam || !match.awayTeam) {
        await flagReview(match.id, raw.statusRaw, now);
        report.review++;
        continue;
      }
      const { fixture, orientation } = orientToMatch(raw, match.homeTeam.nameEn, match.awayTeam.nameEn);
      if (orientation === "unknown") {
        // Teams don't line up (e.g. a remapped knockout slot) → never guess.
        await flagReview(match.id, raw.statusRaw, now);
        report.review++;
        continue;
      }

      const derived = deriveMatchResult(match, fixture);
      if (derived.action === "skip") {
        await prisma.match.update({
          where: { id: match.id },
          data: { lastSyncedAt: now, externalStatus: derived.externalStatus, externalProvider: footballProvider },
        });
        report.skipped++;
        continue;
      }

      const r = derived.result!;
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: r.homeScore,
          awayScore: r.awayScore,
          wentToPenalties: r.wentToPenalties,
          winnerTeamId: r.winnerTeamId,
          status: "FINISHED",
          resultConfirmedAt: now,
          resultSource: footballProvider,
          externalProvider: footballProvider,
          externalStatus: derived.externalStatus,
          lastSyncedAt: now,
          needsReview: derived.action === "review",
        },
      });

      if (derived.action === "score") {
        await calculateMatchPoints(match.id); // EXACT existing scoring path
        report.scored++;
      } else {
        report.review++;
      }
    } catch (e) {
      report.errors++;
      console.error(`[result-sync] match ${match.id} failed:`, (e as Error).message);
    }
  }

  report.rateLimitRemaining = rateLimitRemaining();
  return report;
}

// ---------------------------------------------------------------------------
// Fixture mapping (server-side). Same logic as scripts/map-fixtures.ts but runs
// from the deployed app (which can reach the DB) — exposed to admins via a button.
// ---------------------------------------------------------------------------

export interface MapReport {
  applied: boolean;
  provider: string;
  mapped: { label: string; fixtureId: string }[];
  ambiguous: { label: string; note: string }[];
  unmapped: { label: string; note: string }[];
}

export async function runFixtureMapping(opts: { apply?: boolean } = {}): Promise<MapReport> {
  const report: MapReport = { applied: !!opts.apply, provider: footballProvider, mapped: [], ambiguous: [], unmapped: [] };
  if (!footballApiConfigured) throw new Error("provider not configured");

  const all = await fetchAllFixtures();
  const fixtures = all.map((f) => ({ fixtureId: f.fixtureId, dateISO: f.dateISO, homeName: f.homeName, awayName: f.awayName, venue: f.venue }));

  const matches = await prisma.match.findMany({ include: { homeTeam: true, awayTeam: true }, orderBy: { matchNumber: "asc" } });
  for (const m of matches) {
    const label = `#${m.matchNumber} ${m.homeTeam?.nameEn ?? "TBD"} vs ${m.awayTeam?.nameEn ?? "TBD"}`;
    if (!m.homeTeam || !m.awayTeam) {
      report.unmapped.push({ label, note: "teams not decided" });
      continue;
    }
    const d = evaluateMapping(
      { kickoffAt: m.kickoffAt, homeName: m.homeTeam.nameEn, awayName: m.awayTeam.nameEn, venue: m.stadium },
      fixtures,
    );
    if (d.status === "mapped") {
      report.mapped.push({ label, fixtureId: d.fixtureId! });
      if (opts.apply && m.externalFixtureId !== d.fixtureId) {
        await prisma.match.update({ where: { id: m.id }, data: { externalProvider: footballProvider, externalFixtureId: d.fixtureId } });
      }
    } else if (d.status === "ambiguous") {
      report.ambiguous.push({ label, note: d.note });
    } else {
      report.unmapped.push({ label, note: d.note });
    }
  }
  return report;
}

/** Mark a final match as needing admin review (store status, don't score). */
async function flagReview(matchId: string, status: string, now: Date) {
  await prisma.match.update({
    where: { id: matchId },
    data: { needsReview: true, lastSyncedAt: now, externalStatus: status, externalProvider: footballProvider },
  });
}
