import { prisma } from "./prisma";
import { calculateMatchPoints } from "./matches";
import { fetchAllFixtures, footballApiConfigured, footballProvider, rateLimitRemaining } from "./footballApi";
import { deriveMatchResult, orientToMatch, type ParsedFixture } from "./resultSyncCore";
import { evaluateMapping, teamsEqual } from "./fixtureMapping";
import { fetchEspnLive, fetchEspnEvents, fetchEspnDates, yyyymmdd, type EspnEvent } from "./espn";
import { notifyGoal, notifyGoalCancelled } from "./notifications";
import { resolveArabic } from "./playerNameResolver";
import type { Stage } from "@prisma/client";

// Re-export the pure layer so existing import sites keep working.
export * from "./resultSyncCore";

// ---------------------------------------------------------------------------
// ORCHESTRATION (DB + provider). Reuses calculateMatchPoints for scoring — the
// scoring rules, locking, predictions, and leaderboard logic are untouched.
// ---------------------------------------------------------------------------

const STARTING_SOON_MS = 5 * 60_000;
const LIVE_WINDOW_MS = 4 * 3600_000; // a match counts as "in play" up to ~4h after kickoff
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
      // football-data only finalizes results now. LIVE in-play scores are owned by
      // ESPN (refreshLiveScores) — so for anything not final, do NOT touch the DB
      // here (no live mirror, no lastSyncedAt/externalStatus writes) or we'd clobber
      // ESPN's live score and stall its refresh cadence.
      if (!raw.isFinal) {
        report.skipped++;
        continue;
      }
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
          // Match is over — drop the live mirror so the card shows the final result.
          liveHomeScore: null,
          liveAwayScore: null,
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
// ESPN RESULT SYNC — sole finals + scoring source (free, no key, no fixture id).
// Matches our schedule to ESPN events by team pair + date, orients to our
// home/away, then reuses the EXACT pure pipeline (orientToMatch → deriveMatchResult)
// and the EXACT scoring path (calculateMatchPoints). Manual admin entry still
// overrides and is never removed.
// ---------------------------------------------------------------------------

const ESPN_RESULTS_DAYS = 3; // catch matches finished in the last few days, not yet scored

/**
 * Fetch finished results from ESPN and score them. Drop-in replacement for the
 * old provider-based syncResults — no external fixture id required.
 * @param opts.matchIds  restrict to these matches (admin single-match sync)
 * @param opts.force     re-sync even already-SCORED / needs-review matches (admin)
 */
export async function syncResultsFromEspn(opts: { matchIds?: string[]; force?: boolean } = {}): Promise<SyncReport> {
  const report: SyncReport = {
    provider: "espn",
    checked: 0,
    scored: 0,
    review: 0,
    skipped: 0,
    missingFromProvider: 0,
    errors: 0,
    truncated: false,
    rateLimitRemaining: null,
  };

  const now = new Date();
  const candidates = await prisma.match.findMany({
    where: opts.force
      ? { ...(opts.matchIds ? { id: { in: opts.matchIds } } : {}) }
      : {
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

  let events: Awaited<ReturnType<typeof fetchEspnEvents>>;
  try {
    events = await fetchEspnEvents(ESPN_RESULTS_DAYS);
  } catch (e) {
    console.error("[result-sync:espn] fetch failed:", (e as Error).message);
    return { ...report, errors: 1 };
  }

  const TOL = 3 * 3600_000; // match ESPN event to our kickoff within ±3h

  for (const match of limited) {
    report.checked++;
    try {
      if (!match.homeTeam || !match.awayTeam) {
        report.skipped++;
        continue;
      }
      const home = match.homeTeam.nameEn;
      const away = match.awayTeam.nameEn;

      // Find this fixture's ESPN event (either orientation), near kickoff.
      const ev = events.find((e) => {
        const t = Date.parse(e.dateISO);
        const near = !Number.isFinite(t) || Math.abs(t - match.kickoffAt.getTime()) <= TOL;
        const samePair =
          (teamsEqual(e.homeName, home) && teamsEqual(e.awayName, away)) ||
          (teamsEqual(e.homeName, away) && teamsEqual(e.awayName, home));
        return near && samePair;
      });
      if (!ev) {
        report.missingFromProvider++;
        continue;
      }

      // Only finalize when ESPN says the match is truly over. Live in-play scores
      // are owned by refreshLiveScores — don't touch the DB for non-final here.
      if (ev.state !== "post" || !ev.completed) {
        report.skipped++;
        continue;
      }
      if (ev.homeScore == null || ev.awayScore == null) {
        report.skipped++;
        continue;
      }

      // Build a ParsedFixture from the ESPN event, then run the SAME pure pipeline.
      const parsed: ParsedFixture = {
        fixtureId: match.id,
        dateISO: ev.dateISO,
        statusRaw: ev.detail || "FT",
        isFinal: true,
        goalsHome: ev.homeScore,
        goalsAway: ev.awayScore,
        wentToPenalties: ev.penalties,
        homeWinner: ev.homeWinner,
        awayWinner: ev.awayWinner,
        homeName: ev.homeName,
        awayName: ev.awayName,
        venue: null,
      };

      const { fixture, orientation } = orientToMatch(parsed, home, away);
      if (orientation === "unknown") {
        await flagReview(match.id, parsed.statusRaw, now, "espn");
        report.review++;
        continue;
      }

      const derived = deriveMatchResult(match, fixture);
      if (derived.action === "skip") {
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
          resultSource: "espn",
          externalProvider: "espn",
          externalStatus: derived.externalStatus,
          lastSyncedAt: now,
          needsReview: derived.action === "review",
          // Match is over — drop the live mirror so the card shows the final result.
          liveHomeScore: null,
          liveAwayScore: null,
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
      console.error(`[result-sync:espn] match ${match.id} failed:`, (e as Error).message);
    }
  }

  return report;
}

/**
 * Re-derive a match's FINAL result from an ESPN event and write+rescore it if it
 * differs from what's stored. Fixes matches that were finalized with a wrong score
 * (e.g. an old provider or a transient 0-0) and then frozen as SCORED. Returns true
 * if the stored result changed. Re-scoring is deduped, so it won't re-push.
 */
async function finalizeMatchFromEspn(
  match: {
    id: string;
    stage: Stage;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    winnerTeamId: string | null;
    status: string;
    homeTeam: { nameEn: string } | null;
    awayTeam: { nameEn: string } | null;
  },
  ev: EspnEvent,
  now: Date,
): Promise<boolean> {
  if (!match.homeTeam || !match.awayTeam) return false;
  if (ev.state !== "post" || !ev.completed || ev.homeScore == null || ev.awayScore == null) return false;

  const parsed: ParsedFixture = {
    fixtureId: match.id,
    dateISO: ev.dateISO,
    statusRaw: ev.detail || "FT",
    isFinal: true,
    goalsHome: ev.homeScore,
    goalsAway: ev.awayScore,
    wentToPenalties: ev.penalties,
    homeWinner: ev.homeWinner,
    awayWinner: ev.awayWinner,
    homeName: ev.homeName,
    awayName: ev.awayName,
    venue: null,
  };
  const { fixture, orientation } = orientToMatch(parsed, match.homeTeam.nameEn, match.awayTeam.nameEn);
  if (orientation === "unknown") return false;
  const derived = deriveMatchResult(match, fixture);
  if (derived.action === "skip") return false;
  const r = derived.result!;

  const unchanged =
    match.status === "SCORED" &&
    match.homeScore === r.homeScore &&
    match.awayScore === r.awayScore &&
    match.winnerTeamId === r.winnerTeamId;
  if (unchanged) return false;

  await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      wentToPenalties: r.wentToPenalties,
      winnerTeamId: r.winnerTeamId,
      status: "FINISHED",
      resultConfirmedAt: now,
      resultSource: "espn",
      externalProvider: "espn",
      externalStatus: derived.externalStatus,
      lastSyncedAt: now,
      needsReview: derived.action === "review",
      liveHomeScore: null,
      liveAwayScore: null,
    },
  });
  if (derived.action === "score") await calculateMatchPoints(match.id);
  return true;
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

// ---------------------------------------------------------------------------
// LIVE SCORES — lightweight in-play refresh for the match card.
// ---------------------------------------------------------------------------

export interface LiveScore {
  matchId: string;
  home: number | null;
  away: number | null;
  status: string | null; // provider in-play status, e.g. IN_PLAY | PAUSED
  final: boolean; // provider now reports the match as over → client should refresh
}

let liveInflight: Promise<LiveScore[]> | null = null;

/**
 * Fetch the provider ONCE and mirror the running score into the DB for matches
 * currently in play, returning them. Does NOT score or notify — the cron's
 * syncResults owns finalization. Concurrent callers share one provider call (an
 * in-flight promise), so any number of polling clients cost at most one request.
 */
export async function refreshLiveScores(): Promise<LiveScore[]> {
  if (liveInflight) return liveInflight;
  liveInflight = (async () => {
    const now = new Date();
    const nowMs = now.getTime();
    // In-play candidates: kicked off, no final result yet, within the live window.
    // No external id needed — ESPN is matched by team name + date (free, no key).
    const candidates = await prisma.match.findMany({
      where: { status: { notIn: ["SCORED"] }, homeScore: null, kickoffAt: { lte: now } },
      include: { homeTeam: true, awayTeam: true },
    });
    const inPlay = candidates.filter(
      (m) => m.homeTeam && m.awayTeam && nowMs - m.kickoffAt.getTime() <= LIVE_WINDOW_MS,
    );
    if (inPlay.length === 0) return [];

    let espn: Awaited<ReturnType<typeof fetchEspnLive>>;
    try {
      espn = await fetchEspnLive();
    } catch (e) {
      console.error("[live-scores] ESPN fetch failed:", (e as Error).message);
      return [];
    }

    const TOL = 3 * 3600_000; // match ESPN event to our kickoff within ±3h
    const out: LiveScore[] = [];
    for (const m of inPlay) {
      const home = m.homeTeam!.nameEn;
      const away = m.awayTeam!.nameEn;
      // Find the ESPN event for this fixture (either home/away orientation).
      const ev = espn.find((e) => {
        const t = Date.parse(e.dateISO);
        const near = !Number.isFinite(t) || Math.abs(t - m.kickoffAt.getTime()) <= TOL;
        const samePair =
          (teamsEqual(e.homeName, home) && teamsEqual(e.awayName, away)) ||
          (teamsEqual(e.homeName, away) && teamsEqual(e.awayName, home));
        return near && samePair;
      });
      if (!ev || ev.state === "pre") continue;

      // Orient ESPN's home/away to OUR schedule.
      const reversed = teamsEqual(ev.homeName, away) && teamsEqual(ev.awayName, home);
      const ourHome = reversed ? ev.awayScore : ev.homeScore;
      const ourAway = reversed ? ev.homeScore : ev.awayScore;

      // Capture scorers + push new goals (works for both in-play and just-finished).
      try {
        await processMatchGoals(m, ev, reversed);
      } catch (e) {
        console.error(`[live-scores] goal sync failed for ${m.id}:`, (e as Error).message);
      }

      if (ev.state === "post") {
        // ESPN says full-time — let the results cron set the official final + score.
        out.push({ matchId: m.id, home: ourHome, away: ourAway, status: ev.detail || "FT", final: true });
        continue;
      }

      // In play — mirror the running score for the card.
      await prisma.match.update({
        where: { id: m.id },
        data: {
          liveHomeScore: ourHome,
          liveAwayScore: ourAway,
          externalStatus: ev.detail || "IN_PLAY",
          lastSyncedAt: now,
        },
      });
      out.push({ matchId: m.id, home: ourHome, away: ourAway, status: ev.detail || "IN_PLAY", final: false });
    }
    return out;
  })().finally(() => {
    liveInflight = null;
  });
  return liveInflight;
}

/**
 * Mirror ESPN's scoring plays into MatchGoal: insert NEW goals (push once each),
 * and DELETE goals ESPN has dropped (VAR-cancelled) — pushing a cancellation alert
 * and letting the score recompute. Goals are oriented to our home/away. All pushes
 * are claimed atomically so the cron and a polling client never double-notify.
 *
 * Deploy guard: we seed silently only the first time we ever see a match that
 * ALREADY has 2+ goals (deploying mid-match). A normal live match always pushes.
 *
 * Cancellation guard: removals are only trusted when ESPN's goal COUNT matches its
 * SCORE — this skips the score-lag window (new goal in the feed before the score
 * ticks) and any transient empty feed, so we never falsely cancel a real goal.
 */
async function processMatchGoals(
  m: {
    id: string;
    homeTeam: { nameAr: string } | null;
    awayTeam: { nameAr: string } | null;
  },
  ev: EspnEvent,
  reversed: boolean,
): Promise<void> {
  if (!m.homeTeam || !m.awayTeam) return;

  // Orient each goal's side to our schedule.
  const oriented = ev.goals.map((g, i) => ({
    side: reversed ? (g.side === "home" ? "away" : "home") : g.side,
    player: g.player,
    minute: g.minute,
    note: g.note,
    sortOrder: i,
  }));
  const key = (x: { side: string; player: string; minute: string }) => `${x.side}|${x.player}|${x.minute}`;
  const currentKeys = new Set(oriented.map(key));

  let existing = await prisma.matchGoal.findMany({
    where: { matchId: m.id },
    select: { id: true, side: true, player: true, minute: true, notified: true },
  });

  // --- Cancellations (VAR): stored goals that ESPN no longer reports. ---
  const feedConsistent = oriented.length === (ev.homeScore ?? 0) + (ev.awayScore ?? 0);
  if (feedConsistent) {
    const cancelled = existing.filter((e) => !currentKeys.has(key(e)));
    if (cancelled.length) {
      // Score AFTER the cancellations = current ESPN goal set.
      let ch = 0;
      let ca = 0;
      for (const g of oriented) {
        if (g.side === "home") ch++;
        else ca++;
      }
      const line = `${m.homeTeam.nameAr} ${ch}-${ca} ${m.awayTeam.nameAr}`;
      for (const c of cancelled) {
        // Claim the deletion so only one worker announces it.
        const del = await prisma.matchGoal.deleteMany({ where: { id: c.id } });
        if (del.count !== 1) continue;
        if (!c.notified) continue; // never announced → nothing to retract
        const teamAr = c.side === "home" ? m.homeTeam.nameAr : m.awayTeam.nameAr;
        const playerAr = (await resolveArabic(c.player).catch(() => null)) ?? undefined;
        await notifyGoalCancelled({ matchId: m.id, teamAr, player: c.player, playerAr, minute: c.minute, line });
      }
      existing = existing.filter((e) => currentKeys.has(key(e)));
    }
  }

  // --- New goals. ---
  const have = new Set(existing.map(key));
  const fresh = oriented.filter((g) => !have.has(key(g)));
  if (fresh.length === 0) return;

  // First time we ever see this match AND it already has 2+ goals → backfill from
  // a mid-match deploy; store but don't notify. Otherwise these are live goals.
  const silentSeed = existing.length === 0 && fresh.length >= 2;

  await prisma.matchGoal.createMany({
    data: fresh.map((g) => ({
      matchId: m.id,
      side: g.side,
      player: g.player,
      minute: g.minute,
      sortOrder: g.sortOrder,
      note: g.note,
      notified: silentSeed,
    })),
    skipDuplicates: true,
  });

  // Auto-resolve Arabic names (warms the cache so the card shows them; this is the
  // network path). Best-effort — never block the goal flow on a name lookup.
  await Promise.all(fresh.map((g) => resolveArabic(g.player).catch(() => null)));

  if (silentSeed) return;

  // Claim & push any unnotified goals (exactly-once via the notified flip). The
  // scoreline is computed by counting goals up to and INCLUDING each one, so the
  // alert shows the score right AFTER that goal — never ESPN's `score` field, which
  // lags the goal feed. (ESPN already credits own goals to the benefiting side.)
  const all = await prisma.matchGoal.findMany({
    where: { matchId: m.id },
    orderBy: { sortOrder: "asc" },
  });
  let h = 0;
  let a = 0;
  for (const g of all) {
    if (g.side === "home") h++;
    else a++;
    if (g.notified) continue;
    const claim = await prisma.matchGoal.updateMany({
      where: { id: g.id, notified: false },
      data: { notified: true },
    });
    if (claim.count !== 1) continue; // another worker is handling it
    const teamAr = g.side === "home" ? m.homeTeam.nameAr : m.awayTeam.nameAr;
    const line = `${m.homeTeam.nameAr} ${h}-${a} ${m.awayTeam.nameAr}`;
    const playerAr = (await resolveArabic(g.player).catch(() => null)) ?? undefined;
    await notifyGoal({ matchId: m.id, teamAr, player: g.player, playerAr, minute: g.minute, note: g.note, line });
  }
}

/**
 * Backfill goal scorers for matches that already finished (e.g. before the goals
 * feature existed, or any match missing its scorers). Fetches ESPN's scoreboard
 * for each relevant day, matches by team-pair + date, and stores goals SILENTLY
 * (no push — these are historical). Idempotent: skips matches that already have
 * goals unless force is set. Admin-triggered (best-effort, capped).
 */
export async function backfillMatchGoals(
  opts: { force?: boolean } = {},
): Promise<{ matches: number; goals: number; removed: number; corrected: number }> {
  void opts;
  const now = new Date();
  // ALL finished matches — goal insertion is idempotent (skips existing) and we
  // also reconcile a wrong stored score (e.g. a frozen 0-0) against ESPN.
  const matches = await prisma.match.findMany({
    where: {
      homeScore: { not: null },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: "asc" },
  });
  if (matches.length === 0) return { matches: 0, goals: 0, removed: 0, corrected: 0 };

  // One ESPN fetch per relevant UTC day (± a day, since late kickoffs can land on
  // the adjacent date). Dedupe across all matches.
  const dateSet = new Set<string>();
  for (const m of matches) {
    for (const off of [-1, 0, 1]) dateSet.add(yyyymmdd(new Date(m.kickoffAt.getTime() + off * 86400_000)));
  }
  let events: EspnEvent[];
  try {
    events = await fetchEspnDates([...dateSet]);
  } catch (e) {
    console.error("[goal-backfill] ESPN fetch failed:", (e as Error).message);
    return { matches: 0, goals: 0, removed: 0, corrected: 0 };
  }

  const TOL = 3 * 3600_000;
  let matchesTouched = 0;
  let goalsInserted = 0;
  let removed = 0;
  let corrected = 0;
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    const home = m.homeTeam.nameEn;
    const away = m.awayTeam.nameEn;
    const ev = events.find((e) => {
      const t = Date.parse(e.dateISO);
      const near = !Number.isFinite(t) || Math.abs(t - m.kickoffAt.getTime()) <= TOL;
      const samePair =
        (teamsEqual(e.homeName, home) && teamsEqual(e.awayName, away)) ||
        (teamsEqual(e.homeName, away) && teamsEqual(e.awayName, home));
      return near && samePair;
    });
    if (!ev) continue;

    // Reconcile a wrong stored result (e.g. a frozen 0-0) against ESPN's final.
    try {
      if (await finalizeMatchFromEspn(m, ev, now)) corrected++;
    } catch (e) {
      console.error(`[goal-backfill] reconcile failed for ${m.id}:`, (e as Error).message);
    }

    const reversed = teamsEqual(ev.homeName, away) && teamsEqual(ev.awayName, home);
    const oriented = ev.goals.map((g, i) => ({
      side: reversed ? (g.side === "home" ? "away" : "home") : g.side,
      player: g.player,
      minute: g.minute,
      note: g.note,
      sortOrder: i,
    }));
    const key = (x: { side: string; player: string; minute: string }) => `${x.side}|${x.player}|${x.minute}`;
    const currentKeys = new Set(oriented.map(key));
    const existing = await prisma.matchGoal.findMany({
      where: { matchId: m.id },
      select: { id: true, side: true, player: true, minute: true },
    });

    // Remove stale/cancelled goals no longer in ESPN's final feed (silent — the
    // match is over). Only when the feed is consistent (goal count == final score).
    const feedConsistent = oriented.length === (ev.homeScore ?? 0) + (ev.awayScore ?? 0);
    let kept = existing;
    if (feedConsistent) {
      const stale = existing.filter((e) => !currentKeys.has(key(e)));
      if (stale.length) {
        await prisma.matchGoal.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
        kept = existing.filter((e) => currentKeys.has(key(e)));
        removed += stale.length;
      }
    }

    const have = new Set(kept.map(key));
    const fresh = oriented.filter((g) => !have.has(key(g)));
    if (fresh.length === 0) continue;

    await prisma.matchGoal.createMany({
      data: fresh.map((g) => ({
        matchId: m.id,
        side: g.side,
        player: g.player,
        minute: g.minute,
        sortOrder: g.sortOrder,
        note: g.note,
        notified: true, // historical → never push
      })),
      skipDuplicates: true,
    });
    await Promise.all(fresh.map((g) => resolveArabic(g.player).catch(() => null))); // warm Arabic cache
    matchesTouched++;
    goalsInserted += fresh.length;
  }
  return { matches: matchesTouched, goals: goalsInserted, removed, corrected };
}

/** Mark a final match as needing admin review (store status, don't score). */
async function flagReview(matchId: string, status: string, now: Date, provider: string = footballProvider) {
  await prisma.match.update({
    where: { id: matchId },
    data: { needsReview: true, lastSyncedAt: now, externalStatus: status, externalProvider: provider },
  });
}
