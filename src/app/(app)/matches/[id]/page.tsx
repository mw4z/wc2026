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

  // Mirror the server lock guard: a match is locked once it leaves SCHEDULED or
  // kickoff is reached. Stats are only exposed (and computed) after lock.
  const locked = match.status !== "SCHEDULED" || isKickoffReached(match.kickoffAt);
  const stats = locked ? await getPredictionStatsAfterLock(match.id) : null;

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
      />

      <p className="mt-3 text-center text-sm text-slate-400">
        {UI.kickoff}: <span className="text-slate-200">{formatDateTimeAr(match.kickoffAt)}</span>
      </p>

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
    </div>
  );
}
