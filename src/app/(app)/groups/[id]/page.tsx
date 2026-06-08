import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupForMember, getGroupLeaderboard, GroupError } from "@/lib/groups";
import { UI } from "@/lib/constants";
import { CopyCode } from "@/components/groups/CopyCode";

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
      <div className="card card-accent mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{group.name}</h1>
            {isLeader && <span className="badge mt-1 bg-gold-500/20 text-gold-300">{UI.groupLeader}</span>}
          </div>
          <CopyCode code={group.code} />
        </div>
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div><span className="text-slate-400">الأعضاء: </span><b>{board.length}</b></div>
          <div><span className="text-slate-400">{UI.groupRanking}: </span><b className="text-gold-400">{myRow ? `#${myRow.rank}` : "—"}</b></div>
          <div><span className="text-slate-400">نقاطك: </span><b>{myRow?.totalPoints ?? 0}</b></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/groups/${id}/leaderboard`} className="btn-ghost text-sm">{UI.groupRanking}</Link>
          <Link href={`/groups/${id}/members`} className="btn-ghost text-sm">{UI.groupMembers}</Link>
          <Link href="/matches" className="btn-ghost text-sm">{UI.upcomingMatches}</Link>
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
