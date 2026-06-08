import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupForMember, getGroupLeaderboard, GroupError } from "@/lib/groups";
import { UI } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function GroupLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div>
      <Link href={`/groups/${id}`} className="text-sm text-gold-400 hover:underline">← {group.name}</Link>
      <h1 className="mb-5 mt-2 text-2xl font-extrabold">{UI.groupRanking}</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.rank}</th>
              <th className="p-3">{UI.name}</th>
              <th className="hidden p-3 sm:table-cell">{UI.department}</th>
              <th className="p-3">{UI.totalPoints}</th>
              <th className="hidden p-3 md:table-cell">دقيقة</th>
              <th className="hidden p-3 md:table-cell">نتيجة صحيحة</th>
            </tr>
          </thead>
          <tbody>
            {board.map((r) => (
              <tr key={r.userId} className={`border-b border-white/5 ${r.userId === user.id ? "bg-gold-500/15 ring-1 ring-inset ring-gold-500/40" : ""}`}>
                <td className="p-3 font-bold">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="hidden p-3 text-slate-400 sm:table-cell">{r.department ?? "—"}</td>
                <td className="p-3 font-extrabold text-gold-400">{r.totalPoints}</td>
                <td className="hidden p-3 md:table-cell">{r.exactScores}</td>
                <td className="hidden p-3 md:table-cell">{r.correctOutcomes}</td>
              </tr>
            ))}
            {board.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">لا يوجد أعضاء بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
