import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { lockDueMatches } from "@/lib/matches";
import { formatDateTimeAr } from "@/lib/time";
import { getUI, getLocale } from "@/lib/locale";
import { MatchCard } from "@/components/MatchCard";
import { TournamentHero } from "@/components/TournamentHero";
import { BallIcon, ArrowIcon } from "@/components/icons";
import { serializeMatch, serializePrediction } from "../page";
import { getSerializedGoals } from "@/lib/matchGoals";
import { getMatchCenter } from "@/lib/matchCenter";
import { MatchCenter } from "@/components/MatchCenter";

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

  // Match Center (lineups + events) is relevant from ~90 min before kickoff onward
  // (ESPN publishes lineups about an hour out). Only fetch then, so far-future
  // match pages don't hit ESPN.
  const msToKick = match.kickoffAt.getTime() - Date.now();
  const showCenter = !!(match.homeTeamId && match.awayTeamId) && msToKick <= 90 * 60_000;
  const center = showCenter ? await getMatchCenter(match.id) : null;

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
        goals={(await getSerializedGoals([match.id])).get(match.id) ?? []}
      />

      <p className="mt-3 text-center text-sm text-slate-400">
        {UI.kickoff}: <span className="text-slate-200">{formatDateTimeAr(match.kickoffAt)}</span>
      </p>
      <p className="mt-1 text-center text-xs text-slate-500">{UI.timezoneNote}</p>

      {showCenter && center && (
        <div className="mt-6 scroll-mt-20" id="match-center">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gold-400">
            <BallIcon /> {UI.mcTitle}
          </h2>
          <MatchCenter
            matchId={match.id}
            initial={center}
            homeName={homeName}
            awayName={awayName}
            homeFlag={match.homeTeam?.flagUrl ?? null}
            awayFlag={match.awayTeam?.flagUrl ?? null}
          />
          <p className="mt-2 text-center text-[11px] text-slate-600">{UI.mcRatingNote}</p>
        </div>
      )}
    </div>
  );
}
