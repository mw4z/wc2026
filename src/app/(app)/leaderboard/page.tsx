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
      <div className="mb-5 flex items-end justify-between">
        <h1 className="hero-title text-3xl font-black">{UI.leaderboard}</h1>
        {updatedAt && (
          <span className="text-xs text-slate-500">آخر تحديث: {formatDateTimeAr(updatedAt)}</span>
        )}
      </div>

      {/* Podium — top 3 */}
      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[rows[1], rows[0], rows[2]].map((r, i) =>
            r ? (
              <div
                key={r.id}
                className={`card flex flex-col items-center p-4 text-center ${
                  i === 1 ? "ring-2 ring-gold-500/50" : ""
                } ${i === 1 ? "-mt-3" : "mt-2"}`}
              >
                <div className="text-3xl">{["🥈", "🥇", "🥉"][i]}</div>
                <div className="mt-1 truncate text-sm font-bold">{r.name}</div>
                <div className="text-2xl font-black text-gold-400">{r.totalPoints}</div>
                <div className="text-[10px] text-slate-500">نقطة</div>
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      )}

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
                  className={`border-b border-white/5 transition hover:bg-white/5 ${
                    r.userId === me.id ? "bg-gold-500/15 ring-1 ring-inset ring-gold-500/40" : ""
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
