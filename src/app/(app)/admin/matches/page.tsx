import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL_AR, STATUS_LABEL_AR, isKnockoutStage } from "@/lib/constants";
import { formatDateTimeAr } from "@/lib/time";
import { ResultForm } from "@/components/admin/ResultForm";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  await requireAdmin();
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">إدارة المباريات والنتائج</h1>
      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>#{m.matchNumber} · {STAGE_LABEL_AR[m.stage]}</span>
              <span>{formatDateTimeAr(m.kickoffAt)}</span>
              <span className="badge bg-navy-700 text-slate-300">{STATUS_LABEL_AR[m.status]}</span>
            </div>
            <div className="mb-3 text-center font-bold">
              {m.homeTeam?.nameAr ?? "يُحدد"} × {m.awayTeam?.nameAr ?? "يُحدد"}
            </div>
            {m.homeTeam && m.awayTeam ? (
              <ResultForm
                matchId={m.id}
                isKnockout={isKnockoutStage(m.stage)}
                home={{ id: m.homeTeam.id, name: m.homeTeam.nameAr }}
                away={{ id: m.awayTeam.id, name: m.awayTeam.nameAr }}
                current={{
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                  wentToPenalties: m.wentToPenalties,
                  winnerTeamId: m.winnerTeamId,
                }}
              />
            ) : (
              <p className="text-center text-sm text-slate-500">لا يمكن إدخال النتيجة قبل تحديد الفريقين</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
