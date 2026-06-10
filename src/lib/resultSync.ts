import { prisma } from "./prisma";
import { calculateMatchPoints } from "./matches";
import { fetchFixturesByIds, footballApiConfigured, footballProvider, rateLimitRemaining, type RawFixture } from "./footballApi";
import { parseFixture, deriveMatchResult } from "./resultSyncCore";

// Re-export the pure layer so existing import sites keep working.
export * from "./resultSyncCore";

// ---------------------------------------------------------------------------
// ORCHESTRATION layer (DB + provider). Reuses calculateMatchPoints for scoring —
// scoring rules, locking, predictions, leaderboard logic are untouched.
// ---------------------------------------------------------------------------

const STARTING_SOON_MS = 5 * 60_000; // include matches about to start
const MAX_PER_RUN = 60; // quota guard (3 batches of 20)

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
 * Fetch results for relevant matches and score the finished ones.
 * @param opts.matchIds  restrict to these matches (admin single-match sync)
 * @param opts.force     re-sync even already-SCORED / needs-review matches (admin only)
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

  if (!footballApiConfigured) {
    return { ...report, skippedReason: "provider not configured" };
  }

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
    orderBy: { kickoffAt: "asc" },
  });

  if (candidates.length === 0) return report;

  const limited = candidates.slice(0, MAX_PER_RUN);
  report.truncated = candidates.length > limited.length;

  let fixtures: Map<string, RawFixture>;
  try {
    fixtures = await fetchFixturesByIds(limited.map((m) => m.externalFixtureId!));
  } catch (e) {
    // Provider failure must never break the app — log and report, don't throw.
    console.error("[result-sync] provider fetch failed:", (e as Error).message);
    return { ...report, errors: 1, rateLimitRemaining: rateLimitRemaining() };
  }

  for (const match of limited) {
    const raw = fixtures.get(match.externalFixtureId!);
    report.checked++;
    if (!raw) {
      report.missingFromProvider++;
      continue;
    }
    try {
      const parsed = parseFixture(raw);
      const derived = deriveMatchResult(match, parsed);

      if (derived.action === "skip") {
        // Record that we checked, but change nothing else.
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
        // Reuse the EXACT existing scoring path (idempotent; recalcs leaderboard).
        await calculateMatchPoints(match.id);
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
