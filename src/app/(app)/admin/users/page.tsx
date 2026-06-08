import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRow } from "@/components/admin/UserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">إدارة المستخدمين</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-navy-700 text-xs text-slate-400">
            <tr>
              <th className="p-3">الرقم الوظيفي</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">الإدارة</th>
              <th className="p-3">الصلاحية</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  id: u.id,
                  employeeId: u.employeeId,
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
