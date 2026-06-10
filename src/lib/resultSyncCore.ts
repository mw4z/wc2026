// PURE result-sync logic (no DB / network) — safe to import in unit tests.
// Supports multiple providers by normalizing each into a single ParsedFixture
// shape; the rest of the pipeline (orientation, derive, scoring) is provider-agnostic.

import { isKnockoutStage } from "./constants";
import { teamsEqual } from "./fixtureMapping";
import type { Stage } from "@prisma/client";

// Normalized fixture — what every provider adapter produces.
export interface ParsedFixture {
  fixtureId: string;
  dateISO: string;
  statusRaw: string; // provider's raw status string (for admin display)
  isFinal: boolean; // provider says the match is truly over
  // Score BEFORE penalties (90' or post-extra-time). A knockout decided on
  // penalties keeps the pre-shootout score here.
  goalsHome: number | null;
  goalsAway: number | null;
  wentToPenalties: boolean;
  homeWinner: boolean | null; // provider's "this side advanced" flag
  awayWinner: boolean | null;
  homeName: string;
  awayName: string;
  venue: string | null;
}

// ---- Provider raw shapes (only the fields we read) ----

// API-Football / API-Sports
export interface ApiFootballRaw {
  fixture: { id: number; date: string; status: { short: string }; venue?: { name?: string | null } | null };
  teams: { home: { name: string; winner: boolean | null }; away: { name: string; winner: boolean | null } };
  goals: { home: number | null; away: number | null };
  score: { penalty: { home: number | null; away: number | null } };
}

// football-data.org
export interface FootballDataRaw {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED | ...
  venue?: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    winner: string | null; // HOME_TEAM | AWAY_TEAM | DRAW | null
    duration: string; // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    fullTime: { home: number | null; away: number | null };
  };
}

const API_FOOTBALL_FINAL = new Set(["FT", "AET", "PEN"]);

/** API-Football raw → ParsedFixture. PURE. */
export function parseApiFootball(raw: ApiFootballRaw): ParsedFixture {
  const short = raw.fixture.status.short;
  const penTaken = raw.score?.penalty?.home != null || raw.score?.penalty?.away != null;
  return {
    fixtureId: String(raw.fixture.id),
    dateISO: raw.fixture.date,
    statusRaw: short,
    isFinal: API_FOOTBALL_FINAL.has(short),
    goalsHome: raw.goals?.home ?? null,
    goalsAway: raw.goals?.away ?? null,
    wentToPenalties: short === "PEN" || penTaken,
    homeWinner: raw.teams?.home?.winner ?? null,
    awayWinner: raw.teams?.away?.winner ?? null,
    homeName: raw.teams.home.name,
    awayName: raw.teams.away.name,
    venue: raw.fixture.venue?.name ?? null,
  };
}

/** football-data.org raw → ParsedFixture. PURE. */
export function parseFootballData(raw: FootballDataRaw): ParsedFixture {
  const w = raw.score?.winner ?? null;
  return {
    fixtureId: String(raw.id),
    dateISO: raw.utcDate,
    statusRaw: raw.status,
    isFinal: raw.status === "FINISHED",
    // fullTime excludes the penalty shootout (that's reflected by duration/winner).
    goalsHome: raw.score?.fullTime?.home ?? null,
    goalsAway: raw.score?.fullTime?.away ?? null,
    wentToPenalties: raw.score?.duration === "PENALTY_SHOOTOUT",
    homeWinner: w === "HOME_TEAM" ? true : w ? false : null,
    awayWinner: w === "AWAY_TEAM" ? true : w ? false : null,
    homeName: raw.homeTeam.name,
    awayName: raw.awayTeam.name,
    venue: raw.venue ?? null,
  };
}

export type Orientation = "same" | "reversed" | "unknown";

/**
 * Align a provider fixture to OUR match's home/away. Providers may list the teams
 * in the opposite order; predictions are tied to our orientation, so we swap goals
 * + winner flags when reversed. PURE.
 */
export function orientToMatch(f: ParsedFixture, ourHome: string, ourAway: string): { fixture: ParsedFixture; orientation: Orientation } {
  if (teamsEqual(f.homeName, ourHome) && teamsEqual(f.awayName, ourAway)) {
    return { fixture: f, orientation: "same" };
  }
  if (teamsEqual(f.homeName, ourAway) && teamsEqual(f.awayName, ourHome)) {
    return {
      fixture: {
        ...f,
        goalsHome: f.goalsAway,
        goalsAway: f.goalsHome,
        homeWinner: f.awayWinner,
        awayWinner: f.homeWinner,
        homeName: f.awayName,
        awayName: f.homeName,
      },
      orientation: "reversed",
    };
  }
  return { fixture: f, orientation: "unknown" };
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
  result?: { homeScore: number; awayScore: number; wentToPenalties: boolean; winnerTeamId: string | null };
}

/**
 * Decide what to do with an ORIENTED parsed fixture for a given match. PURE.
 *  - not final               → skip (never guess from a live score)
 *  - group stage final       → score (no qualifier)
 *  - knockout, clear winner   → score (score is pre-penalties; qualifier separate)
 *  - knockout, unclear winner → review (store result, DON'T guess the qualifier)
 *
 * A knockout tied before penalties keeps the draw score (exact/outcome); the
 * qualifier is scored separately via winnerTeamId.
 */
export function deriveMatchResult(match: MatchForDerive, parsed: ParsedFixture): DerivedResult {
  if (!parsed.isFinal) {
    return { action: "skip", externalStatus: parsed.statusRaw, reason: "not final" };
  }
  if (parsed.goalsHome == null || parsed.goalsAway == null) {
    return { action: "skip", externalStatus: parsed.statusRaw, reason: "no goals reported" };
  }

  const base = { homeScore: parsed.goalsHome, awayScore: parsed.goalsAway, wentToPenalties: parsed.wentToPenalties };

  if (!isKnockoutStage(match.stage)) {
    return { action: "score", externalStatus: parsed.statusRaw, result: { ...base, winnerTeamId: null } };
  }

  let winnerTeamId: string | null = null;
  if (parsed.homeWinner === true) winnerTeamId = match.homeTeamId;
  else if (parsed.awayWinner === true) winnerTeamId = match.awayTeamId;

  if (!winnerTeamId) {
    return { action: "review", externalStatus: parsed.statusRaw, reason: "qualifier unclear", result: { ...base, winnerTeamId: null } };
  }
  return { action: "score", externalStatus: parsed.statusRaw, result: { ...base, winnerTeamId } };
}
