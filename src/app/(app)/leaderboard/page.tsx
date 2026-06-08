import Link from "next/link";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/auth";
import { UI } from "@/lib/constants";
import { formatDateTimeAr } from "@/lib/time";
import { TournamentHero, HeroStat, EmptyState } from "@/components/TournamentHero";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await requireUser();
  const rows = await getLeaderboard();
  const updatedAt = rows[0]?.updatedAt;
  const myRow = rows.find((r) => r.userId === me.id);

  return (
    <div>
      <TournamentHero
        title={UI.leaderboard}
        subtitle="ترتيب المتنافسين على صدارة توقعات كأس العالم 2026."
        icon="🏆"
      >
        <HeroStat label={UI.rank} value={myRow ? `#${myRow.rank}` : "—"} />
        <HeroStat label="نقطة" value={myRow?.totalPoints ?? 0} />
        <HeroStat label="مشارك" value={rows.length} />
      </TournamentHero>

      {updatedAt && (
        <p className="mb-4 text-left text-xs text-slate-500">
          آخر تحديث: {formatDateTimeAr(updatedAt)}
        </p>
      )}

      {/* Podium — top 3 */}
      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-3 items-end gap-3">
          {[rows[1], rows[0], rows[2]].map((r, i) =>
            r ? (
              <div
                key={r.id}
                className={`card card-accent flex flex-col items-center p-4 text-center ${
                  i === 1 ? "-mt-2 ring-2 ring-gold-500/60 shadow-[0_0_30px_rgba(233,185,73,0.25)]" : "mt-2"
                } ${r.userId === me.id ? "ring-2 ring-gold-500/60" : ""}`}
              >
                <div className={i === 1 ? "text-4xl" : "text-3xl"}>{["🥈", "🥇", "🥉"][i]}</div>
                <div className="mt-1 max-w-full truncate text-sm font-bold">{r.name}</div>
                <div className={`font-black text-gold-400 ${i === 1 ? "text-3xl" : "text-2xl"}`}>
                  {r.totalPoints}
                </div>
                <div className="text-[10px] text-slate-500">نقطة</div>
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="لا توجد نتائج بعد"
          hint="ابدأ بتوقع المباريات لتظهر على لوحة المتصدرين."
        >
          <Link href="/matches" className="btn-gold">{UI.matches}</Link>
        </EmptyState>
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
