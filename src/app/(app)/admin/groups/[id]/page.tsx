import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembers } from "@/lib/groups";
import { getUI } from "@/lib/locale";
import { formatDateTimeAr } from "@/lib/time";
import { AdminGroupToggle } from "@/components/groups/AdminGroupToggle";

export const dynamic = "force-dynamic";

export default async function AdminGroupDetail({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  await requireAdmin();
  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: { leader: { select: { name: true, phoneE164: true, employeeId: true } } },
  });
  if (!group) {
    return <p className="card p-6 text-center text-slate-400">{UI.groupNotFound}</p>;
  }
  const members = await getGroupMembers(id);
  // Admin-only: phone identifiers for the member list (not exposed by getGroupMembers).
  const identUsers = await prisma.user.findMany({
    where: { id: { in: members.map((m) => m.userId) } },
    select: { id: true, phoneE164: true, employeeId: true },
  });
  const identById = new Map(identUsers.map((u) => [u.id, u.phoneE164 ?? u.employeeId ?? "—"]));
  const leaderIdent = group.leader.phoneE164 ?? group.leader.employeeId ?? "—";

  return (
    <div>
      <Link href="/admin/groups" className="text-sm text-gold-400 hover:underline">← {UI.groups}</Link>
      <div className="card card-accent my-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{group.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {UI.admin.code}: <span className="font-mono tracking-widest text-gold-300">{group.code}</span> ·{" "}
              {UI.groupLeader}: {group.leader.name} (<span dir="ltr">{leaderIdent}</span>) ·{" "}
              {UI.admin.createdAt} {formatDateTimeAr(group.createdAt)}
            </p>
            <p className="mt-1 text-sm">
              {UI.admin.status}:{" "}
              <span className={group.isActive ? "text-ok" : "text-red-400"}>
                {group.isActive ? UI.admin.active : UI.admin.disabled}
              </span>
            </p>
          </div>
          <AdminGroupToggle groupId={group.id} isActive={group.isActive} />
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-gold-400">{UI.groupMembers} ({members.length})</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.name}</th>
              <th className="p-3">{UI.phone}</th>
              <th className="p-3">{UI.roleColumn}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-white/5">
                <td className="p-3 font-semibold">{m.user.name}</td>
                <td className="p-3 font-mono text-xs" dir="ltr">{identById.get(m.userId) ?? "—"}</td>
                <td className="p-3">{m.role === "LEADER" ? UI.groupLeader : UI.memberRole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
