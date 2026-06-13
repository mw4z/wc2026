import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { lockDueMatches } from "@/lib/matches";
import { getUI, getLocale } from "@/lib/locale";
import { TournamentHero, HeroStat, EmptyState } from "@/components/TournamentHero";
import { ListIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function MyPredictionsPage() {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();
  await lockDueMatches();

  const preds = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: { match: { include: { homeTeam: true, awayTeam: true } }, predictedWinner: true },
  });
  // Newest kickoff first.
  preds.sort((a, b) => b.match.kickoffAt.getTime() - a.match.kickoffAt.getTime());

  const tn = (t: { nameAr: string; nameEn: string } | null) => (t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd);
  const totalPoints = preds.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);
  const exact = preds.filter((p) => p.isExactScore).length;

  return (
    <div>
      <TournamentHero title={UI.myPredictions} subtitle={UI.myPredictionsSubtitle} icon={<ListIcon />}>
        <HeroStat label={UI.statPredictions} value={preds.length} />
        <HeroStat label={UI.point} value={totalPoints} />
        <HeroStat label={UI.statExact} value={exact} />
      </TournamentHero>

      {preds.length === 0 ? (
        <EmptyState icon={<ListIcon />} title={UI.noPredictionsMine} hint={UI.noPredictionsMineHint}>
          <Link href="/matches" className="btn-primary">{UI.matches}</Link>
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {preds.map((p) => {
            const m = p.match;
            const finished = m.homeScore != null && m.awayScore != null;
            return (
              <Link
                key={p.id}
                href={`/matches/${m.id}`}
                className="card flex items-center gap-3 p-3 transition hover:border-white/20"
              >
                <span className="w-10 shrink-0 text-center text-[11px] text-slate-500">#{m.matchNumber}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">
                    {tn(m.homeTeam)} {UI.vs} {tn(m.awayTeam)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                    <span>
                      {UI.yourPick}: <span className="font-display tnum text-slate-200">{p.predictedHomeScore}-{p.predictedAwayScore}</span>
                      {p.predictedWinner && <span className="text-slate-500"> · {tn(p.predictedWinner)}</span>}
                    </span>
                    {finished && (
                      <span>
                        {UI.result}: <span className="font-display tnum text-gold-300">{m.homeScore}-{m.awayScore}</span>
                      </span>
                    )}
                  </div>
                </div>
                {p.pointsAwarded != null ? (
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-center font-display text-sm font-extrabold tnum ${p.pointsAwarded > 0 ? "bg-gold-500/15 text-gold-400" : "bg-white/[0.06] text-slate-500"}`}>
                    +{p.pointsAwarded}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-slate-600">{UI.awardPending}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
