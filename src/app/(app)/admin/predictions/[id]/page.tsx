import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL_AR } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminPredictionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return <p className="card p-6 text-center text-slate-400">المباراة غير موجودة.</p>;
  }

  const title = `${match.homeTeam?.nameAr ?? "يُحدد"} × ${match.awayTeam?.nameAr ?? "يُحدد"}`;

  const back = (
    <Link href="/admin/predictions" className="text-sm text-gold-400 hover:underline">
      ← رجوع لقائمة المباريات
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
        <span className="text-sm text-slate-500">#{match.matchNumber} · {STAGE_LABEL_AR[match.stage]}</span>
      </div>

      {/* Distribution */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: `فوز ${match.homeTeam?.nameAr ?? "المضيف"}`, v: pct(home) },
          { label: "تعادل", v: pct(draw) },
          { label: `فوز ${match.awayTeam?.nameAr ?? "الضيف"}`, v: pct(away) },
        ].map((d) => (
          <div key={d.label} className="card p-4 text-center">
            <div className="text-2xl font-black text-gold-400">{d.v}%</div>
            <div className="text-xs text-slate-400">{d.label}</div>
          </div>
        ))}
      </div>

      <p className="mb-2 text-sm text-slate-400">إجمالي التوقعات: {total}</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">المشارك</th>
              <th className="hidden p-3 sm:table-cell">الإدارة</th>
              <th className="p-3">التوقع</th>
              <th className="p-3">المتأهل</th>
              <th className="p-3">النقاط</th>
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
                <td className="p-3 text-slate-300">{p.predictedWinner?.nameAr ?? "—"}</td>
                <td className="p-3 font-bold text-gold-400">{p.pointsAwarded ?? "—"}</td>
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">لا توجد توقعات لهذه المباراة.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
