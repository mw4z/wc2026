import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUI } from "@/lib/locale";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const UI = await getUI();
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      groupMemberships: {
        where: { group: { isActive: true } },
        include: { group: { select: { id: true, name: true } } },
      },
    },
  });

  // Who has enabled push (≥1 subscription). One query, set membership.
  const pushRows = await prisma.pushSubscription.findMany({ select: { userId: true } });
  const pushUsers = new Set(pushRows.map((r) => r.userId));

  const serialized = users.map((u) => ({
    id: u.id,
    identifier: u.email ?? u.phoneE164 ?? u.employeeId ?? "—",
    name: u.name,
    department: u.department,
    role: u.role,
    isActive: u.isActive,
    pushEnabled: pushUsers.has(u.id),
    groups: u.groupMemberships.map((gm) => ({ id: gm.group.id, name: gm.group.name })),
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">{UI.admin.manageUsers}</h1>
      <UsersAdmin users={serialized} meId={me.id} />
    </div>
  );
}
