import Link from "next/link";
import { getLeaderboard } from "@/lib/leaderboard";
import { getUserGroups, getGroupLeaderboard, getTopGroups } from "@/lib/groups";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { TournamentHero, HeroStat, EmptyState } from "@/components/TournamentHero";
import { TrophyIcon } from "@/components/icons";
import { RankMedallion } from "@/components/RankMedallion";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

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
  movement?: number | null;
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
        movement: r.movement,
      }));

  const myRow = rows.find((r) => r.userId === me.id);
  // Always-available overall rank (so users see their global placement even in a group view).
  const myOverall = await prisma.leaderboardEntry.findUnique({
    where: { userId: me.id },
    select: { rank: true },
  });

  // Overall board is capped to the top 100; the user's own row is pinned below if
  // they fall outside it. Group boards are small → never capped.
  const isOverall = !activeGroup;
  // Pre-results state: people are on the board but nobody has scored yet — show an
  // explanation so the big zeros don't read as broken data.
  const noPointsYet = rows.length > 0 && rows.every((r) => r.totalPoints === 0);
  const CAP = 100;
  const displayRows = isOverall ? rows.slice(0, CAP) : rows;
  const myPinned = isOverall && myRow && myRow.rank > CAP ? myRow : null;

  // Top groups (by summed member points) — shown on the overall board only.
  const topGroups = isOverall ? await getTopGroups(50) : [];

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
        title={activeGroup ? activeGroup.name : UI.leaderboardTitle}
        subtitle={UI.leaderboardSubtitle}
        icon={<TrophyIcon />}
      >
        <HeroStat
          label={activeGroup ? UI.groupRanking : UI.yourRank}
          value={myRow ? `#${myRow.rank}` : "—"}
        />
        {activeGroup && (
          <HeroStat label={UI.overallRank} value={myOverall?.rank ? `#${myOverall.rank}` : "—"} />
        )}
        <HeroStat label={UI.yourPoints} value={myRow?.totalPoints ?? 0} />
        <HeroStat label={UI.participants} value={rows.length} />
      </TournamentHero>

      <AdSlot slotId={AD_SLOTS.leaderboardTop} slotName="leaderboard-top" />

      {noPointsYet && (
        <div className="mb-4 rounded-xl border border-accent-500/25 bg-accent-500/[0.07] px-4 py-3 text-center text-sm text-slate-200">
          {UI.noPointsYet}
        </div>
      )}

      <p className="mb-5 text-center text-xs text-slate-400">{UI.leaderboardUpdatedTitle}</p>

      {/* Scope switcher: Overall + one tab per group the user is in */}
      {myGroups.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {scopes.map((s) => (
            <Link
              key={s.id || "overall"}
              href={s.href}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                s.active
                  ? "border-accent-500 bg-accent-500/15 text-accent-400"
                  : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              <span className="inline-block max-w-[150px] truncate align-bottom">{s.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Podium — top 3 */}
      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-3">
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const place = i === 1 ? 1 : i === 0 ? 2 : 3;
            const pad = place === 1 ? "pt-7" : place === 2 ? "pt-4" : "pt-2";
            const pts = place === 1 ? "text-3xl" : place === 2 ? "text-2xl" : "text-xl";
            const med = place === 1 ? "lg" : place === 2 ? "md" : "sm";
            return r ? (
              <div
                key={r.userId}
                className={`card edge-accent reveal flex flex-col items-center px-3 ${pad} pb-4 text-center ${
                  place === 1 ? "shadow-[0_0_36px_rgba(233,185,73,0.18)]" : ""
                } ${r.userId === me.id ? "ring-1 ring-accent-500/50" : ""}`}
              >
                <RankMedallion place={place} size={med} />
                {/* Reserve 2 lines so name length doesn't change card height */}
                <div className="mt-2 flex min-h-[2.4rem] items-center">
                  <span className="line-clamp-2 break-words text-sm font-bold leading-tight text-white">
                    {r.name}
                  </span>
                </div>
                <div className={`mt-auto font-display font-extrabold tnum text-gold-400 ${pts}`}>
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
        <LeaderboardTable
          rows={displayRows}
          myPinned={myPinned ?? null}
          meId={me.id}
          showCapNote={isOverall && rows.length > CAP}
        />
      )}

      {/* Top groups — ranked by summed member points (overall board only) */}
      {isOverall && topGroups.length > 0 && (
        <div className="mt-8">
          <div className="mb-1 flex items-center gap-2">
            <TrophyIcon className="text-gold-400" />
            <h2 className="text-lg font-bold text-gold-400">{UI.topGroups}</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">{UI.topGroupsHint}</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-white/10 text-[11px] text-slate-400">
                <tr>
                  <th className="p-3 font-bold">{UI.rank}</th>
                  <th className="p-3 font-bold">{UI.name}</th>
                  <th className="p-3 font-bold">{UI.members}</th>
                  <th className="p-3 font-bold">{UI.fairScore}</th>
                  <th className="hidden p-3 font-bold sm:table-cell">{UI.avgPerMember}</th>
                  <th className="hidden p-3 font-bold md:table-cell">{UI.colPoints}</th>
                </tr>
              </thead>
              <tbody>
                {topGroups.map((g) => (
                  <tr key={g.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      {g.rank <= 3 ? <RankMedallion place={g.rank} size="sm" /> : <span className="font-display font-bold tnum text-slate-300">{g.rank}</span>}
                    </td>
                    <td className="p-3 font-semibold text-white">{g.name}</td>
                    <td className="p-3 tnum text-slate-400">{g.memberCount}</td>
                    <td className="p-3 font-display font-extrabold tnum text-gold-400">{g.fairScore}</td>
                    <td className="hidden p-3 tnum text-slate-400 sm:table-cell">{g.avgPoints}</td>
                    <td className="hidden p-3 tnum text-slate-400 md:table-cell">{g.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

