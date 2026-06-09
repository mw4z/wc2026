import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUI, getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function AdminPredictionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const UI = await getUI();
  const locale = await getLocale();
  await requireAdmin();
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return <p className="card p-6 text-center text-slate-400">{UI.matchNotFound}</p>;
  }

  const tn = (t: { nameAr: string; nameEn: string } | null, fallback: string) =>
    t ? (locale === "en" ? t.nameEn : t.nameAr) : fallback;
  const winLabel = (n: string) => (locale === "en" ? `${n} ${UI.admin.winWord}` : `${UI.admin.winWord} ${n}`);
  const title = `${tn(match.homeTeam, UI.tbd)} × ${tn(match.awayTeam, UI.tbd)}`;

  const back = (
    <Link href="/admin/predictions" className="text-sm text-gold-400 hover:underline">
      ← {UI.admin.backToMatchesList}
    </Link>
  );

  const predictions = await prisma.prediction.findMany({
    where: { matchId: id },
    include: { user: true, predictedWinner: true },
    orderBy: { submittedAt: "asc" },
  });

  // Outcome distribution.
  let home = 0;
  let draw = 0;
  let away = 0;
  for (const p of predictions) {
    if (p.predictedHomeScore > p.predictedAwayScore) home++;
    else if (p.predictedHomeScore < p.predictedAwayScore) away++;
    else draw++;
  }
  const total = predictions.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <div>
      {back}
      <div className="mb-1 mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <span className="text-sm text-slate-500">#{match.matchNumber} · {UI.stages[match.stage]}</span>
      </div>

      {/* Distribution */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: winLabel(tn(match.homeTeam, UI.home)), v: pct(home) },
          { label: UI.admin.draw, v: pct(draw) },
          { label: winLabel(tn(match.awayTeam, UI.away)), v: pct(away) },
        ].map((d) => (
          <div key={d.label} className="card p-4 text-center">
            <div className="text-2xl font-black text-gold-400">{d.v}%</div>
            <div className="text-xs text-slate-400">{d.label}</div>
          </div>
        ))}
      </div>

      <p className="mb-2 text-sm text-slate-400">{UI.admin.totalPredictions}: {total}</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.admin.colParticipant}</th>
              <th className="hidden p-3 sm:table-cell">{UI.department}</th>
              <th className="p-3">{UI.admin.colPrediction}</th>
              <th className="p-3">{UI.colQualifier}</th>
              <th className="p-3">{UI.admin.colPoints}</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="p-3 font-semibold">{p.user.name}</td>
                <td className="hidden p-3 text-slate-400 sm:table-cell">{p.user.department ?? "—"}</td>
                <td className="p-3 font-bold tabular-nums">
                  {p.predictedHomeScore} - {p.predictedAwayScore}
                </td>
                <td className="p-3 text-slate-300">{tn(p.predictedWinner, "—")}</td>
                <td className="p-3 font-bold text-gold-400">{p.pointsAwarded ?? "—"}</td>
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">{UI.admin.noPredictionsForMatch}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
