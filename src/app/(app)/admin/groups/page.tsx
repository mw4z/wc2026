import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUI } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const UI = await getUI();
  await requireAdmin();
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: { leader: { select: { name: true } }, _count: { select: { members: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">{UI.groups}</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.name}</th>
              <th className="p-3">{UI.admin.code}</th>
              <th className="p-3">{UI.groupLeader}</th>
              <th className="p-3">{UI.members}</th>
              <th className="p-3">{UI.admin.status}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-b border-white/5">
                <td className="p-3 font-semibold">{g.name}</td>
                <td className="p-3 font-mono text-xs tracking-widest text-gold-300">{g.code}</td>
                <td className="p-3 text-slate-300">{g.leader.name}</td>
                <td className="p-3 font-bold text-gold-400">{g._count.members}</td>
                <td className="p-3">
                  <span className={g.isActive ? "text-ok" : "text-red-400"}>
                    {g.isActive ? UI.admin.active : UI.admin.disabled}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/admin/groups/${g.id}`} className="text-gold-400 hover:underline">{UI.admin.view}</Link>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">{UI.admin.noGroupsYet}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
