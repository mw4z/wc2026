import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { lockDueMatches } from "@/lib/matches";
import { isSameDayInTz, formatDateTimeAr } from "@/lib/time";
import { SAMPLE_DATA } from "@/lib/constants";
import { getPredictionLead, predictionOpensAt, type PredictionLead } from "@/lib/settings";
import type { Locale } from "@/lib/i18n";
import { getUI, getLocale } from "@/lib/locale";
import { MatchCard } from "@/components/MatchCard";
import { TournamentHero, HeroStat, EmptyState } from "@/components/TournamentHero";
import { TodaySummary } from "@/components/TodaySummary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AwardsPromo } from "@/components/AwardsPromo";
import { userCanUseAwards, isAwardsLocked, getAwardsProgress } from "@/lib/awards";
import { tournamentName } from "@/lib/tournament";
import { ArrowIcon, BallIcon, ClockIcon, TrophyIcon } from "@/components/icons";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();
  await lockDueMatches(); // keep status badges accurate on load

  const [matches, myPredictions, myGroups] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.prediction.findMany({ where: { userId: user.id } }),
    prisma.groupMember.findMany({
      where: { userId: user.id, group: { isActive: true } },
      select: { group: { select: { id: true, name: true, winnerOnly: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);
  const lead = await getPredictionLead();
  const [canAwards, awardsLocked, awardsProgress, myEntry] = await Promise.all([
    userCanUseAwards(user.id),
    isAwardsLocked(),
    getAwardsProgress(user.id),
    prisma.leaderboardEntry.findUnique({
      where: { userId: user.id },
      select: { totalPoints: true },
    }),
  ]);
  // The viewer's overall points — surfaced in the hero (same figure as the
  // leaderboard's "نقاطك"). Rank/participants are intentionally left off here.
  const myPoints = myEntry?.totalPoints ?? 0;
  // Awards prediction (Golden Ball / Boot) selection has expired, so hide the
  // promo from the matches page even when the feature is enabled. Flip back to
  // `true` after the World Cup final to surface the awarded prizes again.
  const SHOW_AWARDS_PROMO = false;

  // Show the goal-free result picker only when EVERY group the user belongs to is
  // winner-only (no group needs exact goals). Mixed membership keeps score inputs.
  const winnerOnly = myGroups.length > 0 && myGroups.every((m) => m.group.winnerOnly);
  // The user's groups — the card links to each group's revealed member picks once
  // a match starts (a picker when there's more than one).
  const myGroupList = myGroups.map((m) => ({ id: m.group.id, name: m.group.name }));

  const predByMatch = new Map(myPredictions.map((p) => [p.matchId, p]));
  const now = new Date();
  const nowMs = now.getTime();
  const SIX_H = 6 * 3600_000;

  const LIVE_WINDOW = 4 * 3600_000; // a match counts as "in play" up to ~4h after kickoff

  const isDone = (m: (typeof matches)[number]) => m.homeScore != null && m.awayScore != null;
  // In-play: kicked off, no result yet, still within the live window. Pinned to
  // the very top of the page so the match you're watching is always front-and-center.
  const isLive = (m: (typeof matches)[number]) =>
    !isDone(m) && m.kickoffAt.getTime() <= nowMs && nowMs - m.kickoffAt.getTime() <= LIVE_WINDOW;

  // Each match lands in exactly one bucket. Priority: live → finished (has a
  // result) → future (closing-soon / today / upcoming) → stale past (no result,
  // beyond the live window) falls back to finished so it never clutters the top.
  const live: typeof matches = [];
  const closingSoon: typeof matches = [];
  const today: typeof matches = [];
  const upcoming: typeof matches = [];
  const finished: typeof matches = [];
  for (const m of matches) {
    if (isLive(m)) {
      live.push(m);
    } else if (isDone(m)) {
      finished.push(m);
    } else if (m.kickoffAt.getTime() > nowMs) {
      const soon =
        m.status === "SCHEDULED" &&
        m.homeTeamId &&
        m.awayTeamId &&
        m.kickoffAt.getTime() <= nowMs + SIX_H;
      if (soon) closingSoon.push(m);
      else if (isSameDayInTz(m.kickoffAt, now)) today.push(m);
      else upcoming.push(m);
    } else {
      // Past kickoff, no result, beyond the live window → awaiting a result.
      finished.push(m);
    }
  }

  // Open-to-predict = scheduled, teams known, kickoff ahead, and the global
  // prediction window has opened. This is the ACTIONABLE set across ALL days, so
  // the summary keeps nudging even after today's matches are done.
  const openToPredict = matches.filter((m) => {
    if (m.status !== "SCHEDULED" || !m.homeTeamId || !m.awayTeamId || m.kickoffAt <= now) return false;
    const o = predictionOpensAt(m.kickoffAt, lead);
    return !o || o.getTime() <= nowMs;
  });
  const todayAll = matches.filter((m) => isSameDayInTz(m.kickoffAt, now));
  const summary = {
    todayTotal: todayAll.length,
    openTotal: openToPredict.length,
    openMissing: openToPredict.filter((m) => !predByMatch.has(m.id)).length,
    nextLockAt: openToPredict.length
      ? new Date(Math.min(...openToPredict.map((m) => m.kickoffAt.getTime()))).toISOString()
      : null,
  };

  const section = (title: string, list: typeof matches, opts?: { id?: string; live?: boolean }) =>
    list.length > 0 && (
      <section id={opts?.id} className="mb-8 scroll-mt-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow flex items-center gap-2">
            {opts?.live && (
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
            )}
            {title}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-display text-[11px] font-bold text-slate-300">
            {list.length} {UI.matchUnit}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <MatchCard
              key={m.id}
              match={serializeMatch(m, locale, lead)}
              prediction={serializePrediction(predByMatch.get(m.id))}
              winnerOnly={winnerOnly}
              groups={myGroupList}
              live={opts?.live}
              clickable
            />
          ))}
        </div>
      </section>
    );

  return (
    <div id="matches-top" className="reveal-stack scroll-mt-4">
      {SAMPLE_DATA && (
        <div className="mb-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-center text-sm text-amber-200">
          {UI.sampleNotice}
        </div>
      )}
      <TournamentHero title={UI.matchesHeroTitle} subtitle={UI.matchesHeroSubtitle} icon={<BallIcon />}>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3.5 py-1.5 text-sm font-semibold text-accent-200">
          <TrophyIcon className="text-[15px]" />
          <span className="text-accent-200/70">{UI.activeTournament}:</span>
          <span className="font-bold text-white">{tournamentName(locale)}</span>
        </span>
        <HeroStat label={UI.yourPoints} value={myPoints} />
      </TournamentHero>
      <p className="-mt-2 mb-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-300">
        <ClockIcon className="text-sm text-accent-400" />
        {UI.timezoneNote}
      </p>
      {SHOW_AWARDS_PROMO && canAwards && (
        <AwardsPromo locked={awardsLocked} predicted={awardsProgress.predicted} total={awardsProgress.total} />
      )}
      <InstallPrompt />
      {(summary.openTotal > 0 || summary.todayTotal > 0) && (
        <TodaySummary
          todayTotal={summary.todayTotal}
          openTotal={summary.openTotal}
          openMissing={summary.openMissing}
          nextLockAt={summary.nextLockAt}
        />
      )}
      {finished.length > 0 && (
        <div className="mb-3 flex justify-end">
          <a
            href="#finished-matches"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-accent-400"
          >
            <ClockIcon className="text-[13px]" />
            {UI.viewPrevious}
            <span className="text-slate-500">({finished.length})</span>
          </a>
        </div>
      )}
      <AdSlot slotId={AD_SLOTS.matchesTop} slotName="matches-top" />
      {matches.length === 0 && <EmptyState title={UI.noMatchesTitle} hint={UI.noMatchesHint} />}
      {section(UI.liveNow, live, { live: true })}
      {section(UI.closingSoonTitle, closingSoon)}
      {section(UI.todayMatches, today)}
      {section(UI.upcomingMatches, upcoming)}
      {section(UI.finishedMatches, finished, { id: "finished-matches" })}
      {finished.length > 0 && (
        <div className="mt-2 flex justify-center">
          <a
            href="#matches-top"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-accent-400"
          >
            <ArrowIcon className="rotate-90 text-[13px]" />
            {UI.backToTop}
          </a>
        </div>
      )}
    </div>
  );
}

type MatchWithTeams = Prisma.MatchGetPayload<{ include: { homeTeam: true; awayTeam: true } }>;
type TeamRow = MatchWithTeams["homeTeam"];

// Serialize for the client component (Dates → ISO strings). Team display name
// is resolved to the active locale here (server-side) so the client component
// stays locale-agnostic; a language toggle re-runs this via router.refresh().
export function serializeMatch(m: MatchWithTeams, locale: Locale = "ar", lead: PredictionLead = "always") {
  const team = (t: TeamRow) =>
    t ? { id: t.id, name: locale === "en" ? t.nameEn : t.nameAr, code: t.code, flagUrl: t.flagUrl } : null;
  const opensAt = predictionOpensAt(m.kickoffAt, lead);
  return {
    id: m.id,
    matchNumber: m.matchNumber,
    stage: m.stage,
    status: m.status,
    kickoffAt: m.kickoffAt.toISOString(),
    city: m.city,
    stadium: m.stadium,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    // Live (in-play) running score + raw provider status, for the live card.
    liveHomeScore: m.liveHomeScore,
    liveAwayScore: m.liveAwayScore,
    liveStatus: m.externalStatus,
    homeTeam: team(m.homeTeam),
    awayTeam: team(m.awayTeam),
    // Kickoff date/time, formatted in Saudi time (UTC+3) for display on the card.
    kickoffLabel: formatDateTimeAr(m.kickoffAt),
    // Global prediction-opening window (null = always open).
    opensAt: opensAt ? opensAt.toISOString() : null,
    opensAtLabel: opensAt ? formatDateTimeAr(opensAt) : null,
  };
}
export function serializePrediction(p?: { predictedHomeScore: number; predictedAwayScore: number; predictedWinnerTeamId: string | null; pointsAwarded: number | null }) {
  if (!p) return null;
  return {
    predictedHomeScore: p.predictedHomeScore,
    predictedAwayScore: p.predictedAwayScore,
    predictedWinnerTeamId: p.predictedWinnerTeamId,
    pointsAwarded: p.pointsAwarded,
  };
}
export type SerializedMatch = ReturnType<typeof serializeMatch>;
export type SerializedPrediction = ReturnType<typeof serializePrediction>;
