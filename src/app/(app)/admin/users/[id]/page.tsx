import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserGroups } from "@/lib/groups";
import { STAGE_LABEL_AR } from "@/lib/constants";
import { formatDateTimeAr } from "@/lib/time";

export const dynamic = "force-dynamic";

// Admin view of a single participant + every prediction they submitted.
export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return <p className="card p-6 text-center text-slate-400">المستخدم غير موجود.</p>;
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: id },
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
      predictedWinner: true,
    },
    orderBy: { match: { matchNumber: "asc" } },
  });

  const totalPoints = predictions.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);
  const groups = await getUserGroups(id);

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-gold-400 hover:underline">
        ← رجوع لقائمة المستخدمين
      </Link>

      <h1 className="mb-1 mt-2 text-2xl font-extrabold">{user.name}</h1>
      <p className="mb-2 text-sm text-slate-400">
        رقم الجوال: <span className="font-mono" dir="ltr">{user.phoneE164 ?? user.employeeId ?? "—"}</span>
        {user.department ? ` · ${user.department}` : ""} · {user.role === "ADMIN" ? "مدير" : "مشارك"}
        {" · "}
        <span className={user.isActive ? "text-ok" : "text-red-400"}>
          {user.isActive ? "نشط" : "موقوف"}
        </span>
        {" · "}عدد التوقعات: {predictions.length} · مجموع النقاط: {totalPoints}
        {" · "}انضم في {formatDateTimeAr(user.createdAt)}
      </p>

      <div className="mb-6">
        <span className="text-xs font-bold text-slate-400">المجموعات المنضم إليها:</span>{" "}
        {groups.length === 0 ? (
          <span className="text-sm text-slate-500">لا توجد</span>
        ) : (
          <span className="inline-flex flex-wrap gap-1.5 align-middle">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/admin/groups/${g.id}`}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs hover:border-gold-500/50"
              >
                {g.name}
                <span className="text-slate-500"> · {g.role === "LEADER" ? "قائد" : "عضو"}</span>
              </Link>
            ))}
          </span>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">المباراة</th>
              <th className="p-3">توقعه</th>
              <th className="p-3">المتأهل</th>
              <th className="p-3">النقاط</th>
              <th className="hidden p-3 md:table-cell">أُرسل في</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="p-3 text-slate-400">{p.match.matchNumber}</td>
                <td className="p-3 font-semibold">
                  {p.match.homeTeam?.nameAr ?? "يُحدد"} × {p.match.awayTeam?.nameAr ?? "يُحدد"}
                  <span className="mr-1 text-xs text-slate-500"> · {STAGE_LABEL_AR[p.match.stage]}</span>
                </td>
                <td className="p-3 font-bold tabular-nums">
                  {p.predictedHomeScore} - {p.predictedAwayScore}
                </td>
                <td className="p-3 text-slate-300">{p.predictedWinner?.nameAr ?? "—"}</td>
                <td className="p-3 font-bold text-gold-400">{p.pointsAwarded ?? "—"}</td>
                <td className="hidden p-3 text-xs text-slate-400 md:table-cell">
                  {formatDateTimeAr(p.submittedAt)}
                </td>
              </tr>
            ))}
            {predictions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  لم يُرسل هذا المستخدم أي توقعات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
