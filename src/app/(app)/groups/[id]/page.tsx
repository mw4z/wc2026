import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupForMember, getGroupLeaderboard, GroupError } from "@/lib/groups";
import { getUI } from "@/lib/locale";
import { CopyCode } from "@/components/groups/CopyCode";
import { TournamentHero, HeroStat } from "@/components/TournamentHero";
import { UsersIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function GroupDashboard({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const user = await requireUser();
  const { id } = await params;
  const isAdmin = user.role === "ADMIN";

  let group;
  try {
    ({ group } = await getGroupForMember(user.id, id, isAdmin));
  } catch (e) {
    const msg = e instanceof GroupError ? e.message : UI.groupNotFound;
    return <p className="card p-6 text-center text-amber-200">{msg}</p>;
  }

  const board = await getGroupLeaderboard(id);
  const myRow = board.find((r) => r.userId === user.id);
  const top5 = board.slice(0, 5);
  const isLeader = group.leaderId === user.id;

  return (
    <div>
      <TournamentHero
        title={group.name}
        subtitle={isLeader ? `${UI.groupLeader} · ${UI.groupsSubtitle}` : UI.groupsSubtitle}
        icon={<UsersIcon />}
      >
        <HeroStat label={UI.members} value={board.length} />
        <HeroStat label={UI.groupRanking} value={myRow ? `#${myRow.rank}` : "—"} />
        <HeroStat label={UI.point} value={myRow?.totalPoints ?? 0} />
      </TournamentHero>

      <div className="card card-accent mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CopyCode code={group.code} />
          <div className="flex flex-wrap gap-2">
            <Link href={`/groups/${id}/leaderboard`} className="btn-ghost text-sm">{UI.groupRanking}</Link>
            <Link href={`/groups/${id}/members`} className="btn-ghost text-sm">{UI.groupMembers}</Link>
            <Link href="/matches" className="btn-ghost text-sm">{UI.matches}</Link>
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-gold-400">{UI.topFive}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.rank}</th>
              <th className="p-3">{UI.name}</th>
              <th className="p-3">{UI.totalPoints}</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((r) => (
              <tr key={r.userId} className={`border-b border-white/5 ${r.userId === user.id ? "bg-gold-500/15" : ""}`}>
                <td className="p-3">
                  <span className={`font-display font-bold tnum ${r.rank === 1 ? "text-gold-400" : "text-slate-300"}`}>
                    {r.rank}
                  </span>
                </td>
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 font-extrabold text-gold-400">{r.totalPoints}</td>
              </tr>
            ))}
            {board.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-slate-500">{UI.noMembersYet}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
