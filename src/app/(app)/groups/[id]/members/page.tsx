import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupForMember, getGroupMembers, GroupError } from "@/lib/groups";
import { getUI } from "@/lib/locale";
import { ArrowIcon } from "@/components/icons";
import { GroupMembersClient } from "@/components/groups/GroupMembersClient";

export const dynamic = "force-dynamic";

export default async function GroupMembersPage({ params }: { params: Promise<{ id: string }> }) {
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

  const members = await getGroupMembers(id);
  const isLeader = group.leaderId === user.id;

  return (
    <div>
      <Link
        href={`/groups/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400 transition hover:text-accent-500"
      >
        <ArrowIcon className="text-base rtl:-scale-x-100" />
        {UI.backToGroup}
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-extrabold">{UI.groupMembers}</h1>
      <GroupMembersClient
        groupId={id}
        isLeader={isLeader}
        leaderId={group.leaderId}
        currentUserId={user.id}
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          department: m.user.department,
          role: m.role,
        }))}
      />
    </div>
  );
}
