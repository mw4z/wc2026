import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { lockDueMatches } from "@/lib/matches";
import { getPredictionStatsAfterLock } from "@/lib/predictions";
import { isKickoffReached } from "@/lib/time";
import { getUI, getLocale } from "@/lib/locale";
import { PredictionDistribution } from "@/components/PredictionDistribution";
import { TournamentHero } from "@/components/TournamentHero";
import { GroupPicksButton } from "@/components/MatchCard";
import { BallIcon, ArrowIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function MatchPredictionsPage({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();
  const { id } = await params;
  await lockDueMatches();

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

  const myGroups = await prisma.groupMember.findMany({
    where: { userId: user.id, group: { isActive: true } },
    select: { group: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const myGroupList = myGroups.map((m) => ({ id: m.group.id, name: m.group.name }));

  // Stats are only exposed (and computed) after the match locks (kickoff reached).
  const locked = match.status !== "SCHEDULED" || isKickoffReached(match.kickoffAt);
  const stats = locked ? await getPredictionStatsAfterLock(match.id) : null;

  const allPredictions = locked
    ? await prisma.prediction.findMany({
        where: { matchId: match.id },
        include: { user: { select: { name: true } }, predictedWinner: { select: { nameAr: true, nameEn: true } } },
      })
    : [];
  allPredictions.sort(
    (a, b) => (b.pointsAwarded ?? -1) - (a.pointsAwarded ?? -1) || a.user.name.localeCompare(b.user.name),
  );

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
        href={`/matches/${match.id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400 transition hover:text-accent-500"
      >
        <ArrowIcon className="text-base rtl:-scale-x-100" />
        {UI.backToMatches}
      </Link>

      <TournamentHero
        title={`${homeName} ${UI.vs} ${awayName}`}
        subtitle={`#${match.matchNumber} · ${UI.matchPredictionsTitle}`}
        icon={<BallIcon />}
      />

      <div className="mt-6">
        {locked && stats ? (
          <PredictionDistribution stats={stats} homeName={homeName} awayName={awayName} actual={actual} />
        ) : (
          <p className="card p-5 text-center text-sm text-slate-500">{UI.distributionAfterLock}</p>
        )}
      </div>

      {myGroupList.length > 0 && (
        <div className="mt-4">
          <GroupPicksButton groups={myGroupList} />
        </div>
      )}

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
                <span className="inline-flex shrink-0 items-center gap-1 font-display tnum text-slate-200">
                  <span>{p.predictedHomeScore}</span>
                  <span className="text-slate-600">-</span>
                  <span>{p.predictedAwayScore}</span>
                </span>
                {p.predictedWinner && (
                  <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">{teamName(p.predictedWinner)}</span>
                )}
                {p.pointsAwarded != null && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${p.pointsAwarded > 0 ? "bg-gold-500/15 text-gold-400" : "bg-white/[0.06] text-slate-500"}`}
                  >
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
