import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserGroups } from "@/lib/groups";
import { getUI, getLocale } from "@/lib/locale";
import { formatDateTimeAr } from "@/lib/time";

export const dynamic = "force-dynamic";

// Admin view of a single participant + every prediction they submitted.
export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const locale = await getLocale();
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return <p className="card p-6 text-center text-slate-400">{UI.admin.userNotFound}</p>;
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
  const tn = (t: { nameAr: string; nameEn: string } | null, fallback: string) =>
    t ? (locale === "en" ? t.nameEn : t.nameAr) : fallback;

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-gold-400 hover:underline">
        ← {UI.admin.backToUsers}
      </Link>

      <h1 className="mb-1 mt-2 text-2xl font-extrabold">{user.name}</h1>
      <p className="mb-2 text-sm text-slate-400">
        {UI.phone}: <span className="font-mono" dir="ltr">{user.phoneE164 ?? user.employeeId ?? "—"}</span>
        {user.department ? ` · ${user.department}` : ""} · {user.role === "ADMIN" ? UI.roleAdmin : UI.roleUser}
        {" · "}
        <span className={user.isActive ? "text-ok" : "text-red-400"}>
          {user.isActive ? UI.admin.statusActive : UI.admin.statusSuspended}
        </span>
        {" · "}{UI.predictionsCount}: {predictions.length} · {UI.totalPoints}: {totalPoints}
        {" · "}{UI.admin.joinedAt} {formatDateTimeAr(user.createdAt)}
      </p>

      <div className="mb-6">
        <span className="text-xs font-bold text-slate-400">{UI.admin.groupsJoined}</span>{" "}
        {groups.length === 0 ? (
          <span className="text-sm text-slate-500">{UI.admin.none}</span>
        ) : (
          <span className="inline-flex flex-wrap gap-1.5 align-middle">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/admin/groups/${g.id}`}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs hover:border-gold-500/50"
              >
                {g.name}
                <span className="text-slate-500"> · {g.role === "LEADER" ? UI.admin.leaderShort : UI.memberRole}</span>
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
              <th className="p-3">{UI.admin.colMatch}</th>
              <th className="p-3">{UI.admin.colPrediction}</th>
              <th className="p-3">{UI.colQualifier}</th>
              <th className="p-3">{UI.admin.colPoints}</th>
              <th className="hidden p-3 md:table-cell">{UI.admin.submittedAt}</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="p-3 text-slate-400">{p.match.matchNumber}</td>
                <td className="p-3 font-semibold">
                  {tn(p.match.homeTeam, UI.tbd)} × {tn(p.match.awayTeam, UI.tbd)}
                  <span className="mr-1 text-xs text-slate-500"> · {UI.stages[p.match.stage]}</span>
                </td>
                <td className="p-3 font-bold tabular-nums">
                  {p.predictedHomeScore} - {p.predictedAwayScore}
                </td>
                <td className="p-3 text-slate-300">{tn(p.predictedWinner, "—")}</td>
                <td className="p-3 font-bold text-gold-400">{p.pointsAwarded ?? "—"}</td>
                <td className="hidden p-3 text-xs text-slate-400 md:table-cell">
                  {formatDateTimeAr(p.submittedAt)}
                </td>
              </tr>
            ))}
            {predictions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  {UI.admin.noPredictionsByUser}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
