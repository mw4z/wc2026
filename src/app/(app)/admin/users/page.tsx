import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUI } from "@/lib/locale";
import { UserRow } from "@/components/admin/UserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const UI = await getUI();
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">{UI.admin.manageUsers}</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-navy-700 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.phone}</th>
              <th className="p-3">{UI.name}</th>
              <th className="p-3">{UI.department}</th>
              <th className="p-3">{UI.roleLabel}</th>
              <th className="p-3">{UI.admin.status}</th>
              <th className="p-3">{UI.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  id: u.id,
                  identifier: u.phoneE164 ?? u.employeeId ?? "—",
                  name: u.name,
                  department: u.department,
                  role: u.role,
                  isActive: u.isActive,
                }}
                isSelf={u.id === me.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
