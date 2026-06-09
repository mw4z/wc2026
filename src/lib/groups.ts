import { prisma } from "./prisma";

export class GroupError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

/**
 * Normalize flexible user input to the canonical "CUP-XXXXX" code.
 * Accepts: "CUP-48291", "cup48291", "CUP 48291", "48291", etc.
 * Returns null if it doesn't contain exactly 5 digits.
 */
export function normalizeGroupCode(input: string): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (digits.length !== 5) return null;
  return `CUP-${digits}`;
}

/** Generate a unique "CUP-XXXXX" code (5 digits, retries on collision). */
export async function generateGroupCode(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const n = Math.floor(Math.random() * 100000);
    const code = `CUP-${String(n).padStart(5, "0")}`;
    const exists = await prisma.group.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new GroupError("تعذّر توليد كود فريد، حاول مرة أخرى", "CODE_GEN_FAILED", 500);
}

export async function createGroup(userId: string, name: string) {
  const code = await generateGroupCode();
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: { name: name.trim(), code, leaderId: userId },
    });
    await tx.groupMember.create({
      data: { groupId: group.id, userId, role: "LEADER" },
    });
    return group;
  });
}

export async function joinGroupByCode(userId: string, codeInput: string) {
  const code = normalizeGroupCode(codeInput);
  if (!code) {
    throw new GroupError("كود المجموعة غير صحيح", "CODE_INVALID", 422);
  }
  const group = await prisma.group.findUnique({ where: { code } });
  if (!group || !group.isActive) {
    throw new GroupError("المجموعة غير موجودة أو تم تعطيلها", "GROUP_NOT_FOUND", 404);
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing) {
    return { group, alreadyMember: true };
  }
  await prisma.groupMember.create({ data: { groupId: group.id, userId, role: "MEMBER" } });
  return { group, alreadyMember: false };
}

/** Validate a code points to a joinable (existing, active) group — without joining. */
export async function assertGroupJoinable(codeInput: string) {
  const code = normalizeGroupCode(codeInput);
  if (!code) throw new GroupError("كود المجموعة غير صحيح", "CODE_INVALID", 422);
  const group = await prisma.group.findUnique({ where: { code } });
  if (!group || !group.isActive) {
    throw new GroupError("المجموعة غير موجودة أو تم تعطيلها", "GROUP_NOT_FOUND", 404);
  }
  return group;
}

export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, group: { isActive: true } },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    code: m.group.code,
    role: m.role,
    memberCount: m.group._count.members,
  }));
}

/** Loads a group only if the user is a member (or override for admin). */
export async function getGroupForMember(userId: string, groupId: string, isAdmin = false) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || (!group.isActive && !isAdmin)) {
    throw new GroupError("المجموعة غير موجودة أو تم تعطيلها", "GROUP_NOT_FOUND", 404);
  }
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership && !isAdmin) {
    throw new GroupError("لا تملك صلاحية الوصول لهذه المجموعة", "NOT_A_MEMBER", 403);
  }
  return { group, membership };
}

export async function requireGroupLeader(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new GroupError("المجموعة غير موجودة أو تم تعطيلها", "GROUP_NOT_FOUND", 404);
  if (group.leaderId !== userId) {
    throw new GroupError("لا تملك صلاحية إدارة هذه المجموعة", "NOT_LEADER", 403);
  }
  return group;
}

export async function regenerateGroupCode(userId: string, groupId: string) {
  await requireGroupLeader(userId, groupId);
  const code = await generateGroupCode(); // new code; old one stops working immediately
  return prisma.group.update({ where: { id: groupId }, data: { code } });
}

export async function renameGroup(userId: string, groupId: string, name: string) {
  await requireGroupLeader(userId, groupId);
  return prisma.group.update({ where: { id: groupId }, data: { name: name.trim() } });
}

export async function removeGroupMember(leaderId: string, groupId: string, memberUserId: string) {
  const group = await requireGroupLeader(leaderId, groupId);
  if (memberUserId === group.leaderId) {
    throw new GroupError("لا يمكن إزالة قائد المجموعة", "CANNOT_REMOVE_LEADER", 409);
  }
  await prisma.groupMember.deleteMany({ where: { groupId, userId: memberUserId } });
  return { ok: true };
}

/** A non-leader member leaves the group. Leaders must transfer/deactivate instead. */
export async function leaveGroup(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new GroupError("المجموعة غير موجودة أو تم تعطيلها", "GROUP_NOT_FOUND", 404);
  if (group.leaderId === userId) {
    throw new GroupError("قائد المجموعة لا يمكنه المغادرة", "LEADER_CANNOT_LEAVE", 409);
  }
  await prisma.groupMember.deleteMany({ where: { groupId, userId } });
  return { ok: true };
}

// Member-facing: never exposes phone/employee identifiers.
export async function getGroupMembers(groupId: string) {
  return prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, department: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
}

/**
 * Group leaderboard = global LeaderboardEntry filtered to this group's members,
 * re-ranked with the SAME tie-breakers. No per-group scoring data.
 */
export async function getGroupLeaderboard(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, department: true } } },
  });
  const ids = members.map((m) => m.userId);
  const entries = await prisma.leaderboardEntry.findMany({ where: { userId: { in: ids } } });
  const byUser = new Map(entries.map((e) => [e.userId, e]));

  const rows = members.map((m) => {
    const e = byUser.get(m.userId);
    return {
      userId: m.userId,
      name: m.user.name,
      department: m.user.department,
      totalPoints: e?.totalPoints ?? 0,
      exactScores: e?.exactScores ?? 0,
      correctOutcomes: e?.correctOutcomes ?? 0,
      correctQualifiers: e?.correctQualifiers ?? 0,
      totalPredictions: e?.totalPredictions ?? 0,
      accuracy: e?.accuracy ?? 0,
      lastPredictionAt: e?.lastPredictionAt ?? null,
    };
  });

  rows.sort(
    (x, y) =>
      y.totalPoints - x.totalPoints ||
      y.exactScores - x.exactScores ||
      y.correctOutcomes - x.correctOutcomes ||
      lastPredCompare(x.lastPredictionAt, y.lastPredictionAt),
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

function lastPredCompare(a: Date | null, b: Date | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.getTime() - b.getTime();
}

/** Admin-only: activate/deactivate a group. */
export async function setGroupActive(groupId: string, isActive: boolean) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new GroupError("المجموعة غير موجودة", "GROUP_NOT_FOUND", 404);
  return prisma.group.update({ where: { id: groupId }, data: { isActive } });
}
