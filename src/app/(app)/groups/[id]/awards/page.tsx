import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupForMember, GroupError } from "@/lib/groups";
import { getGroupAwardsBoard } from "@/lib/awards";
import { getUI } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function GroupAwardsBoardPage({ params }: { params: Promise<{ id: string }> }) {
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

  const board = await getGroupAwardsBoard(id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gold-400">{UI.awardsBoard}</h1>
          <p className="text-sm text-slate-400">{group.name}</p>
        </div>
        <Link href={`/groups/${id}`} className="btn-ghost px-3 py-1.5 text-sm">{UI.backToGroup}</Link>
      </div>

      <p className="mb-4 rounded-lg border border-accent-500/20 bg-accent-500/[0.06] px-4 py-2 text-center text-xs text-accent-200">
        {UI.awardsSeparateNote}
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.rank}</th>
              <th className="p-3">{UI.name}</th>
              <th className="p-3">{UI.pointsShort}</th>
            </tr>
          </thead>
          <tbody>
            {board.map((r) => (
              <tr key={r.userId} className={`border-b border-white/5 ${r.userId === user.id ? "bg-gold-500/15" : ""}`}>
                <td className="p-3">
                  <span className={`font-display font-bold tnum ${r.rank === 1 ? "text-gold-400" : "text-slate-300"}`}>{r.rank}</span>
                </td>
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 font-extrabold text-gold-400">{r.points}</td>
              </tr>
            ))}
            {board.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-slate-500">{UI.noMembersYet}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-sm">
        <Link href="/awards" className="text-accent-400 hover:underline">{UI.awardsPredict} ←</Link>
      </p>
    </div>
  );
}
