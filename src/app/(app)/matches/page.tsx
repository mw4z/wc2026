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
import { TournamentHero, EmptyState } from "@/components/TournamentHero";
import { TodaySummary } from "@/components/TodaySummary";
import { ReminderToggle } from "@/components/ReminderToggle";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AwardsPromo } from "@/components/AwardsPromo";
import { userCanUseAwards, isAwardsLocked } from "@/lib/awards";
import { BallIcon, ClockIcon } from "@/components/icons";
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
      select: { group: { select: { winnerOnly: true } } },
    }),
  ]);
  const lead = await getPredictionLead();
  const [canAwards, awardsLocked] = await Promise.all([userCanUseAwards(user.id), isAwardsLocked()]);

  // Show the goal-free result picker only when EVERY group the user belongs to is
  // winner-only (no group needs exact goals). Mixed membership keeps score inputs.
  const winnerOnly = myGroups.length > 0 && myGroups.every((m) => m.group.winnerOnly);

  const predByMatch = new Map(myPredictions.map((p) => [p.matchId, p]));
  const now = new Date();
  const nowMs = now.getTime();
  const SIX_H = 6 * 3600_000;

  // Closing soon: still-open matches kicking off within the next 6 hours.
  const closingSoon = matches.filter(
    (m) =>
      m.status === "SCHEDULED" &&
      m.homeTeamId &&
      m.awayTeamId &&
      m.kickoffAt.getTime() > nowMs &&
      m.kickoffAt.getTime() <= nowMs + SIX_H,
  );
  const closingIds = new Set(closingSoon.map((m) => m.id));

  const today = matches.filter((m) => isSameDayInTz(m.kickoffAt, now) && !closingIds.has(m.id));
  const upcoming = matches.filter(
    (m) => m.kickoffAt > now && !isSameDayInTz(m.kickoffAt, now) && !closingIds.has(m.id),
  );
  const finished = matches.filter(
    (m) => m.kickoffAt <= now && !isSameDayInTz(m.kickoffAt, now),
  );

  // Today summary (counts ALL of today's matches, including closing-soon ones).
  const todayAll = matches.filter((m) => isSameDayInTz(m.kickoffAt, now));
  const todayOpen = todayAll.filter((m) => m.status === "SCHEDULED" && m.kickoffAt > now);
  const summary = {
    total: todayAll.length,
    submitted: todayAll.filter((m) => predByMatch.has(m.id)).length,
    missing: todayOpen.filter((m) => !predByMatch.has(m.id)).length,
    nextLockAt: todayOpen.length
      ? new Date(Math.min(...todayOpen.map((m) => m.kickoffAt.getTime()))).toISOString()
      : null,
  };

  const section = (title: string, list: typeof matches) =>
    list.length > 0 && (
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="eyebrow">{title}</span>
          <span className="font-display text-xs text-slate-500">{list.length}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <MatchCard
              key={m.id}
              match={serializeMatch(m, locale, lead)}
              prediction={serializePrediction(predByMatch.get(m.id))}
              winnerOnly={winnerOnly}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div>
      {SAMPLE_DATA && (
        <div className="mb-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-center text-sm text-amber-200">
          {UI.sampleNotice}
        </div>
      )}
      <TournamentHero title={UI.appName} subtitle={UI.matchesHeroSubtitle} icon={<BallIcon />} />
      <p className="-mt-2 mb-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ClockIcon className="text-sm text-accent-400" />
        {UI.timezoneNote}
      </p>
      {canAwards && <AwardsPromo locked={awardsLocked} />}
      <InstallPrompt />
      <ReminderToggle />
      {summary.total > 0 && (
        <TodaySummary
          total={summary.total}
          submitted={summary.submitted}
          missing={summary.missing}
          nextLockAt={summary.nextLockAt}
        />
      )}
      <AdSlot slotId={AD_SLOTS.matchesTop} slotName="matches-top" />
      {matches.length === 0 && <EmptyState title={UI.noMatchesTitle} hint={UI.noMatchesHint} />}
      {section(UI.closingSoonTitle, closingSoon)}
      {section(UI.todayMatches, today)}
      {section(UI.upcomingMatches, upcoming)}
      {section(UI.finishedMatches, finished)}
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
    homeTeam: team(m.homeTeam),
    awayTeam: team(m.awayTeam),
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
