import Link from "next/link";
import { getLeaderboard } from "@/lib/leaderboard";
import { getUserGroups, getGroupLeaderboard } from "@/lib/groups";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { TournamentHero, HeroStat, EmptyState } from "@/components/TournamentHero";
import { TrophyIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

// A single row shape covering both the global leaderboard and a group board.
type Row = {
  userId: string;
  name: string;
  department: string | null;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  correctQualifiers: number;
  accuracy: number;
  rank: number;
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const UI = await getUI();
  const me = await requireUser();
  const { group: groupParam } = await searchParams;

  // Scope = a group the user belongs to, or "overall".
  const myGroups = await getUserGroups(me.id);
  const activeGroup = groupParam ? myGroups.find((g) => g.id === groupParam) : undefined;

  const rows: Row[] = activeGroup
    ? await getGroupLeaderboard(activeGroup.id)
    : (await getLeaderboard()).map((r) => ({
        userId: r.userId,
        name: r.name,
        department: r.department,
        totalPoints: r.totalPoints,
        exactScores: r.exactScores,
        correctOutcomes: r.correctOutcomes,
        correctQualifiers: r.correctQualifiers,
        accuracy: r.accuracy,
        rank: r.rank,
      }));

  const myRow = rows.find((r) => r.userId === me.id);
  // Always-available overall rank (so users see their global placement even in a group view).
  const myOverall = await prisma.leaderboardEntry.findUnique({
    where: { userId: me.id },
    select: { rank: true },
  });

  const scopes = [
    { id: "", label: UI.overall, href: "/leaderboard", active: !activeGroup },
    ...myGroups.map((g) => ({
      id: g.id,
      label: g.name,
      href: `/leaderboard?group=${g.id}`,
      active: activeGroup?.id === g.id,
    })),
  ];

  return (
    <div>
      <TournamentHero
        title={activeGroup ? activeGroup.name : UI.leaderboard}
        subtitle={UI.leaderboardSubtitle}
        icon={<TrophyIcon />}
      >
        <HeroStat
          label={activeGroup ? UI.groupRanking : UI.overallRank}
          value={myRow ? `#${myRow.rank}` : "—"}
        />
        {activeGroup && (
          <HeroStat label={UI.overallRank} value={myOverall?.rank ? `#${myOverall.rank}` : "—"} />
        )}
        <HeroStat label={UI.point} value={myRow?.totalPoints ?? 0} />
        <HeroStat label={UI.participant} value={rows.length} />
      </TournamentHero>

      {/* Scope switcher: Overall + one tab per group the user is in */}
      {myGroups.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {scopes.map((s) => (
            <Link
              key={s.id || "overall"}
              href={s.href}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                s.active
                  ? "border-accent-500 bg-accent-500/15 text-accent-400"
                  : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {/* Podium — top 3 */}
      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-3 items-end gap-3">
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const place = i === 1 ? 1 : i === 0 ? 2 : 3;
            return r ? (
              <div
                key={r.userId}
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
                <div className="text-[10px] text-slate-500">{UI.point}</div>
              </div>
            ) : (
              <div key={i} />
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={<TrophyIcon />} title={UI.noResultsTitle} hint={UI.noResultsHint}>
          <Link href="/matches" className="btn-primary">{UI.matches}</Link>
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-white/10 text-[11px] text-slate-400">
              <tr>
                <th className="p-3 font-bold">{UI.rank}</th>
                <th className="p-3 font-bold">{UI.name}</th>
                <th className="hidden p-3 font-bold sm:table-cell">{UI.department}</th>
                <th className="p-3 font-bold">{UI.totalPoints}</th>
                <th className="hidden p-3 font-bold md:table-cell">{UI.colExact}</th>
                <th className="hidden p-3 font-bold md:table-cell">{UI.colCorrect}</th>
                <th className="hidden p-3 font-bold lg:table-cell">{UI.colQualifier}</th>
                <th className="hidden p-3 font-bold lg:table-cell">{UI.colAccuracy}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.userId}
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
