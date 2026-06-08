import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/auth";
import { UI } from "@/lib/constants";
import { formatDateTimeAr } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await requireUser();
  const rows = await getLeaderboard();
  const updatedAt = rows[0]?.updatedAt;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <h1 className="text-2xl font-extrabold">{UI.leaderboard}</h1>
        {updatedAt && (
          <span className="text-xs text-slate-500">آخر تحديث: {formatDateTimeAr(updatedAt)}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-center text-slate-400">لا توجد نتائج بعد.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-navy-700 text-xs text-slate-400">
              <tr>
                <th className="p-3">{UI.rank}</th>
                <th className="p-3">{UI.name}</th>
                <th className="hidden p-3 sm:table-cell">{UI.department}</th>
                <th className="p-3">{UI.totalPoints}</th>
                <th className="hidden p-3 md:table-cell">دقيقة</th>
                <th className="hidden p-3 md:table-cell">نتيجة صحيحة</th>
                <th className="hidden p-3 lg:table-cell">متأهل</th>
                <th className="hidden p-3 lg:table-cell">الدقة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-navy-800 ${
                    r.userId === me.id ? "bg-gold-500/10" : ""
                  }`}
                >
                  <td className="p-3 font-bold">
                    {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                  </td>
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="hidden p-3 text-slate-400 sm:table-cell">{r.department ?? "—"}</td>
                  <td className="p-3 font-extrabold text-gold-400">{r.totalPoints}</td>
                  <td className="hidden p-3 md:table-cell">{r.exactScores}</td>
                  <td className="hidden p-3 md:table-cell">{r.correctOutcomes}</td>
                  <td className="hidden p-3 lg:table-cell">{r.correctQualifiers}</td>
                  <td className="hidden p-3 lg:table-cell">{(r.accuracy * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
