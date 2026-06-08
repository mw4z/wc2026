import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupForMember, getGroupLeaderboard, GroupError } from "@/lib/groups";
import { UI } from "@/lib/constants";
import { CopyCode } from "@/components/groups/CopyCode";
import { TournamentHero, HeroStat } from "@/components/TournamentHero";

export const dynamic = "force-dynamic";

export default async function GroupDashboard({ params }: { params: Promise<{ id: string }> }) {
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
        subtitle={isLeader ? `${UI.groupLeader} · نافِس زملاءك داخل مجموعتك` : "نافِس زملاءك داخل مجموعتك"}
        icon="🏅"
      >
        <HeroStat label="عضو" value={board.length} />
        <HeroStat label={UI.groupRanking} value={myRow ? `#${myRow.rank}` : "—"} />
        <HeroStat label="نقطة" value={myRow?.totalPoints ?? 0} />
      </TournamentHero>

      <div className="card card-accent mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CopyCode code={group.code} />
          <div className="flex flex-wrap gap-2">
            <Link href={`/groups/${id}/leaderboard`} className="btn-ghost text-sm">{UI.groupRanking}</Link>
            <Link href={`/groups/${id}/members`} className="btn-ghost text-sm">{UI.groupMembers}</Link>
            <Link href="/matches" className="btn-ghost text-sm">{UI.upcomingMatches}</Link>
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-gold-400">أعلى 5 في المجموعة</h2>
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
                <td className="p-3 font-bold">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 font-extrabold text-gold-400">{r.totalPoints}</td>
              </tr>
            ))}
            {board.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-slate-500">لا يوجد أعضاء بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
