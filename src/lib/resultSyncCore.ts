// PURE result-sync logic (no DB / network) — safe to import in unit tests.
// The orchestration that touches the DB lives in resultSync.ts.

import { isKnockoutStage } from "./constants";
import type { RawFixture } from "./footballApi";
import type { Stage } from "@prisma/client";

// Only these provider statuses mean the match is truly over. We NEVER score on a
// live or in-progress status, and never derive a result from a live score.
//   FT  = full time (90')   AET = after extra time   PEN = decided on penalties
export const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

export interface ParsedFixture {
  fixtureId: string;
  statusShort: string;
  isFinal: boolean;
  // Goals are the official score BEFORE penalties (provider `goals` excludes the
  // shootout; it reflects 90' or post-extra-time).
  goalsHome: number | null;
  goalsAway: number | null;
  wentToPenalties: boolean;
  homeWinner: boolean | null;
  awayWinner: boolean | null;
}

/** Normalize a raw provider fixture into the fields the sync cares about. */
export function parseFixture(raw: RawFixture): ParsedFixture {
  const statusShort = raw.fixture.status.short;
  const penaltyTaken = raw.score?.penalty?.home != null || raw.score?.penalty?.away != null;
  return {
    fixtureId: String(raw.fixture.id),
    statusShort,
    isFinal: FINAL_STATUSES.has(statusShort),
    goalsHome: raw.goals?.home ?? null,
    goalsAway: raw.goals?.away ?? null,
    wentToPenalties: statusShort === "PEN" || penaltyTaken,
    homeWinner: raw.teams?.home?.winner ?? null,
    awayWinner: raw.teams?.away?.winner ?? null,
  };
}

export interface MatchForDerive {
  stage: Stage;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export type DeriveAction = "skip" | "score" | "review";

export interface DerivedResult {
  action: DeriveAction;
  externalStatus: string;
  reason?: string;
  // Present when action is "score" or "review".
  result?: {
    homeScore: number;
    awayScore: number;
    wentToPenalties: boolean;
    winnerTeamId: string | null;
  };
}

/**
 * Decide what to do with a parsed fixture for a given match. PURE.
 *  - not final              → skip (never guess from a live score)
 *  - group stage final      → score (no qualifier)
 *  - knockout, clear winner  → score (score is pre-penalties; qualifier separate)
 *  - knockout, unclear winner → review (store result, DON'T guess the qualifier)
 *
 * A knockout tied before penalties keeps the draw score (for exact/outcome); the
 * qualifier is scored separately via winnerTeamId.
 */
export function deriveMatchResult(match: MatchForDerive, parsed: ParsedFixture): DerivedResult {
  if (!parsed.isFinal) {
    return { action: "skip", externalStatus: parsed.statusShort, reason: "not final" };
  }
  if (parsed.goalsHome == null || parsed.goalsAway == null) {
    return { action: "skip", externalStatus: parsed.statusShort, reason: "no goals reported" };
  }

  const base = {
    homeScore: parsed.goalsHome,
    awayScore: parsed.goalsAway,
    wentToPenalties: parsed.wentToPenalties,
  };

  if (!isKnockoutStage(match.stage)) {
    return { action: "score", externalStatus: parsed.statusShort, result: { ...base, winnerTeamId: null } };
  }

  // Knockout: map the provider's winner flag onto OUR team id. Mapping enforces
  // same home/away orientation, so home/away align with the provider.
  let winnerTeamId: string | null = null;
  if (parsed.homeWinner === true) winnerTeamId = match.homeTeamId;
  else if (parsed.awayWinner === true) winnerTeamId = match.awayTeamId;

  if (!winnerTeamId) {
    return {
      action: "review",
      externalStatus: parsed.statusShort,
      reason: "qualifier unclear",
      result: { ...base, winnerTeamId: null },
    };
  }
  return { action: "score", externalStatus: parsed.statusShort, result: { ...base, winnerTeamId } };
}
