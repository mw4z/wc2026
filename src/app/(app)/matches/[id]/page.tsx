import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { lockDueMatches } from "@/lib/matches";
import { getPredictionStatsAfterLock } from "@/lib/predictions";
import { isKickoffReached, formatDateTimeAr } from "@/lib/time";
import { getUI, getLocale } from "@/lib/locale";
import { MatchCard } from "@/components/MatchCard";
import { PredictionDistribution } from "@/components/PredictionDistribution";
import { TournamentHero } from "@/components/TournamentHero";
import { BallIcon, ArrowIcon } from "@/components/icons";
import { serializeMatch, serializePrediction } from "../page";
import { getSerializedGoals } from "@/lib/matchGoals";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();
  const { id } = await params;
  await lockDueMatches(); // keep status badge accurate on load

  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!match) {
    return (
      <div>
        <Link href="/matches" className="mb-4 inline-block text-sm text-gold-400 hover:underline">
          → {UI.backToMatches}
        </Link>
        <p className="card p-6 text-center text-amber-200">{UI.matchNotFound}</p>
      </div>
    );
  }

  const myPrediction = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: user.id, matchId: match.id } },
  });

  // Goal-free picker when every group the user is in is winner-only.
  const myGroups = await prisma.groupMember.findMany({
    where: { userId: user.id, group: { isActive: true } },
    select: { group: { select: { id: true, name: true, winnerOnly: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const winnerOnly = myGroups.length > 0 && myGroups.every((m) => m.group.winnerOnly);
  const myGroupList = myGroups.map((m) => ({ id: m.group.id, name: m.group.name }));

  // Mirror the server lock guard: a match is locked once it leaves SCHEDULED or
  // kickoff is reached. Stats are only exposed (and computed) after lock.
  const locked = match.status !== "SCHEDULED" || isKickoffReached(match.kickoffAt);
  const stats = locked ? await getPredictionStatsAfterLock(match.id) : null;

  // After lock, reveal everyone's individual predictions + points (anti-cheat:
  // only once the match has started / finished).
  const allPredictions = locked
    ? await prisma.prediction.findMany({
        where: { matchId: match.id },
        include: { user: { select: { name: true } }, predictedWinner: { select: { nameAr: true, nameEn: true } } },
      })
    : [];
  allPredictions.sort(
    (a, b) => (b.pointsAwarded ?? -1) - (a.pointsAwarded ?? -1) || a.user.name.localeCompare(b.user.name),
  );

  // Actual outcome (pre-penalty), once a result is recorded — matches how the
  // distribution buckets predictions, so the highlight lines up.
  let actual: "HOME" | "DRAW" | "AWAY" | null = null;
  if (match.homeScore != null && match.awayScore != null) {
    actual = match.homeScore > match.awayScore ? "HOME" : match.homeScore < match.awayScore ? "AWAY" : "DRAW";
  }

  const teamName = (t: { nameAr: string; nameEn: string } | null) =>
    t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd;
  const homeName = teamName(match.homeTeam);
  const awayName = teamName(match.awayTeam);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/matches"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400 transition hover:text-accent-500"
      >
        <ArrowIcon className="text-base rtl:-scale-x-100" />
        {UI.backToMatches}
      </Link>

      <TournamentHero
        title={`${homeName} ${UI.vs} ${awayName}`}
        subtitle={`#${match.matchNumber} · ${UI.stages[match.stage]}${match.stadium ? ` · ${match.stadium}` : ""}`}
        icon={<BallIcon />}
      />

      <MatchCard
        match={serializeMatch(match, locale)}
        prediction={serializePrediction(myPrediction ?? undefined)}
        winnerOnly={winnerOnly}
        groups={myGroupList}
        goals={(await getSerializedGoals([match.id])).get(match.id) ?? []}
      />

      <p className="mt-3 text-center text-sm text-slate-400">
        {UI.kickoff}: <span className="text-slate-200">{formatDateTimeAr(match.kickoffAt)}</span>
      </p>
      <p className="mt-1 text-center text-xs text-slate-500">{UI.timezoneNote}</p>

      <div className="mt-6">
        {locked && stats ? (
          <PredictionDistribution
            stats={stats}
            homeName={homeName}
            awayName={awayName}
            actual={actual}
          />
        ) : (
          <p className="card p-5 text-center text-sm text-slate-500">{UI.distributionAfterLock}</p>
        )}
      </div>

      {locked && allPredictions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gold-400">
            <BallIcon /> {UI.allPredictionsTitle}
          </h2>
          <div className="card overflow-hidden divide-y divide-white/[0.06]">
            {allPredictions.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 text-sm ${p.userId === user.id ? "bg-accent-500/10" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-100">
                  {p.user.name}
                  {p.userId === user.id && <span className="ms-1 text-[10px] text-accent-300">({UI.yourPick})</span>}
                </span>
                <span className="shrink-0 font-display tnum text-slate-200">
                  {p.predictedHomeScore}-{p.predictedAwayScore}
                </span>
                {p.predictedWinner && (
                  <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
                    {teamName(p.predictedWinner)}
                  </span>
                )}
                {p.pointsAwarded != null && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${p.pointsAwarded > 0 ? "bg-gold-500/15 text-gold-400" : "bg-white/[0.06] text-slate-500"}`}>
                    +{p.pointsAwarded}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
