import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/groups";
import { getUI } from "@/lib/locale";
import { EmptyState } from "@/components/TournamentHero";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const UI = await getUI();
  const user = await requireUser();
  const groups = await getUserGroups(user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{UI.groupsTitle}</h1>
        <div className="flex gap-2">
          <Link href="/groups/join" className="btn-ghost text-sm">{UI.joinGroup}</Link>
          <Link href="/groups/new" className="btn-gold text-sm">{UI.createGroup}</Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState title={UI.noGroupsTitle} hint={UI.noGroupsHint}>
          <Link href="/groups/new" className="btn-gold">{UI.createGroup}</Link>
          <Link href="/groups/join" className="btn-ghost">{UI.joinGroup}</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="card p-4 transition hover:-translate-y-0.5 hover:border-white/20">
              <div className="flex items-center justify-between">
                <span className="font-bold">{g.name}</span>
                {g.role === "LEADER" && (
                  <span className="badge bg-gold-500/20 text-gold-300">{UI.groupLeader}</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono tracking-widest text-gold-300">{g.code}</span>
                <span>{g.memberCount} {UI.members}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
