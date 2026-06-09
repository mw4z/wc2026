import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUI, getLocale } from "@/lib/locale";
import { formatDateTimeAr } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  const UI = await getUI();
  const locale = await getLocale();
  await requireAdmin();
  const matches = await prisma.match.findMany({
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: true,
      awayTeam: true,
      _count: { select: { predictions: true } },
    },
  });
  const tn = (t: { nameAr: string; nameEn: string } | null) =>
    t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">{UI.admin.predictionsTitle}</h1>
      <p className="mb-6 text-sm text-slate-400">{UI.admin.predictionsNote}</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">{UI.admin.colMatch}</th>
              <th className="hidden p-3 sm:table-cell">{UI.admin.colDate}</th>
              <th className="p-3">{UI.admin.status}</th>
              <th className="p-3">{UI.statPredictions}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              return (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="p-3 text-slate-400">{m.matchNumber}</td>
                  <td className="p-3 font-semibold">
                    {tn(m.homeTeam)} × {tn(m.awayTeam)}
                    <span className="mr-1 text-xs text-slate-500"> · {UI.stages[m.stage]}</span>
                  </td>
                  <td className="hidden p-3 text-xs text-slate-400 sm:table-cell">
                    {formatDateTimeAr(m.kickoffAt)}
                  </td>
                  <td className="p-3">
                    <span className="badge bg-navy-700 text-slate-300">{UI.statuses[m.status]}</span>
                  </td>
                  <td className="p-3 font-bold text-gold-400">{m._count.predictions}</td>
                  <td className="p-3">
                    <Link href={`/admin/predictions/${m.id}`} className="text-gold-400 hover:underline">
                      {UI.admin.view}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
