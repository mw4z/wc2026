import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL_AR, STATUS_LABEL_AR } from "@/lib/constants";
import { formatDateTimeAr, isKickoffReached } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  await requireAdmin();
  const matches = await prisma.match.findMany({
    orderBy: { matchNumber: "asc" },
    include: {
      homeTeam: true,
      awayTeam: true,
      _count: { select: { predictions: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">عرض توقعات المشاركين</h1>
      <p className="mb-6 text-sm text-slate-400">
        تظهر توقعات المشاركين بعد إغلاق التوقع (بداية المباراة) فقط، حفاظًا على نزاهة المسابقة.
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">المباراة</th>
              <th className="hidden p-3 sm:table-cell">الموعد</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">التوقعات</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const locked = m.status !== "SCHEDULED" || isKickoffReached(m.kickoffAt);
              return (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="p-3 text-slate-400">{m.matchNumber}</td>
                  <td className="p-3 font-semibold">
                    {m.homeTeam?.nameAr ?? "يُحدد"} × {m.awayTeam?.nameAr ?? "يُحدد"}
                    <span className="mr-1 text-xs text-slate-500"> · {STAGE_LABEL_AR[m.stage]}</span>
                  </td>
                  <td className="hidden p-3 text-xs text-slate-400 sm:table-cell">
                    {formatDateTimeAr(m.kickoffAt)}
                  </td>
                  <td className="p-3">
                    <span className="badge bg-navy-700 text-slate-300">{STATUS_LABEL_AR[m.status]}</span>
                  </td>
                  <td className="p-3 font-bold text-gold-400">{m._count.predictions}</td>
                  <td className="p-3">
                    {locked ? (
                      <Link href={`/admin/predictions/${m.id}`} className="text-gold-400 hover:underline">
                        عرض
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">مخفي حتى الإغلاق</span>
                    )}
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
