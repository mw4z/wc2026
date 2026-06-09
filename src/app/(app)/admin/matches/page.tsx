import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isKnockoutStage } from "@/lib/constants";
import { getUI, getLocale } from "@/lib/locale";
import { formatDateTimeAr } from "@/lib/time";
import { ResultForm } from "@/components/admin/ResultForm";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const UI = await getUI();
  const locale = await getLocale();
  await requireAdmin();
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });
  const tn = (t: { nameAr: string; nameEn: string } | null) =>
    t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">{UI.admin.manageMatches}</h1>
      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>#{m.matchNumber} · {UI.stages[m.stage]}</span>
              <span>{formatDateTimeAr(m.kickoffAt)}</span>
              <span className="badge bg-navy-700 text-slate-300">{UI.statuses[m.status]}</span>
            </div>
            <div className="mb-3 text-center font-bold">
              {tn(m.homeTeam)} × {tn(m.awayTeam)}
            </div>
            {m.homeTeam && m.awayTeam ? (
              <ResultForm
                matchId={m.id}
                isKnockout={isKnockoutStage(m.stage)}
                home={{ id: m.homeTeam.id, name: tn(m.homeTeam) }}
                away={{ id: m.awayTeam.id, name: tn(m.awayTeam) }}
                current={{
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                  wentToPenalties: m.wentToPenalties,
                  winnerTeamId: m.winnerTeamId,
                }}
              />
            ) : (
              <p className="text-center text-sm text-slate-500">{UI.admin.cannotEnterResult}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
