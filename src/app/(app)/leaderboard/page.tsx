import Link from "next/link";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/auth";
import { UI } from "@/lib/constants";
import { formatDateTimeAr } from "@/lib/time";
import { TournamentHero, HeroStat, EmptyState } from "@/components/TournamentHero";
import { TrophyIcon } from "@/components/icons";

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
        icon={<TrophyIcon />}
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
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const place = i === 1 ? 1 : i === 0 ? 2 : 3;
            return r ? (
              <div
                key={r.id}
                className={`card edge-accent reveal flex flex-col items-center p-4 text-center ${
                  place === 1 ? "-mt-2 shadow-[0_0_36px_rgba(233,185,73,0.18)]" : "mt-2"
                } ${r.userId === me.id ? "ring-1 ring-accent-500/50" : ""}`}
              >
                <RankMedallion place={place} size={place === 1 ? "lg" : "md"} />
                <div className="mt-2 max-w-full truncate text-sm font-bold text-white">{r.name}</div>
                <div
                  className={`font-display font-extrabold tnum text-gold-400 ${
                    place === 1 ? "text-3xl" : "text-2xl"
                  }`}
                >
                  {r.totalPoints}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">نقطة</div>
              </div>
            ) : (
              <div key={i} />
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon />}
          title="لا توجد نتائج بعد"
          hint="ابدأ بتوقع المباريات لتظهر على لوحة المتصدرين."
        >
          <Link href="/matches" className="btn-primary">{UI.matches}</Link>
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3 font-bold">{UI.rank}</th>
                <th className="p-3 font-bold">{UI.name}</th>
                <th className="hidden p-3 font-bold sm:table-cell">{UI.department}</th>
                <th className="p-3 font-bold">{UI.totalPoints}</th>
                <th className="hidden p-3 font-bold md:table-cell">دقيقة</th>
                <th className="hidden p-3 font-bold md:table-cell">نتيجة صحيحة</th>
                <th className="hidden p-3 font-bold lg:table-cell">متأهل</th>
                <th className="hidden p-3 font-bold lg:table-cell">الدقة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-white/5 transition hover:bg-white/5 ${
                    r.userId === me.id ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/40" : ""
                  }`}
                >
                  <td className="p-3">
                    {r.rank <= 3 ? (
                      <RankMedallion place={r.rank} size="sm" />
                    ) : (
                      <span className="font-display font-bold tnum text-slate-300">{r.rank}</span>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-white">{r.name}</td>
                  <td className="hidden p-3 text-slate-400 sm:table-cell">{r.department ?? "—"}</td>
                  <td className="p-3 font-display font-extrabold tnum text-gold-400">{r.totalPoints}</td>
                  <td className="hidden p-3 tnum md:table-cell">{r.exactScores}</td>
                  <td className="hidden p-3 tnum md:table-cell">{r.correctOutcomes}</td>
                  <td className="hidden p-3 tnum lg:table-cell">{r.correctQualifiers}</td>
                  <td className="hidden p-3 tnum lg:table-cell">{(r.accuracy * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RankMedallion({ place, size = "md" }: { place: number; size?: "sm" | "md" | "lg" }) {
  const tone: Record<number, string> = {
    1: "bg-gold-500/20 text-gold-300 ring-gold-500/50",
    2: "bg-white/10 text-slate-200 ring-white/25",
    3: "bg-amber-700/25 text-amber-300 ring-amber-600/40",
  };
  const dim =
    size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-lg";
  return (
    <span
      className={`grid place-items-center rounded-full font-display font-extrabold tnum ring-2 ${
        tone[place] ?? "bg-white/10 text-slate-200 ring-white/20"
      } ${dim}`}
    >
      {place}
    </span>
  );
}
