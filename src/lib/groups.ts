import { prisma } from "./prisma";
import {
  type GroupScoringConfig,
  effectiveConfig,
  pointsForFlags,
} from "./groupScoring";
import { pushConfigured, sendPush } from "./push";
import { memberJoinedPayload } from "./notifications";

/**
 * Notify a group's leader (via Web Push) that a new member joined. Best-effort:
 * never throws, never blocks the join from succeeding.
 */
async function notifyLeaderOfJoin(group: { id: string; name: string; leaderId: string }, joinerId: string) {
  if (!pushConfigured || group.leaderId === joinerId) return;
  try {
    const [subs, joiner] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { userId: group.leaderId } }),
      prisma.user.findUnique({ where: { id: joinerId }, select: { name: true } }),
    ]);
    if (subs.length === 0) return;
    const payload = memberJoinedPayload(joiner?.name ?? "عضو جديد", group.name, group.id);
    for (const s of subs) await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
  } catch (e) {
    console.error("notifyLeaderOfJoin failed:", (e as Error).message);
  }
}

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
  await notifyLeaderOfJoin(group, userId);
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

/** Leader toggles tournament-award predictions for their group. */
export async function setGroupAwardsEnabled(userId: string, groupId: string, enabled: boolean) {
  await requireGroupLeader(userId, groupId);
  return prisma.group.update({ where: { id: groupId }, data: { awardsEnabled: enabled } });
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

/**
 * Transfer leadership to another member. The current leader is demoted to a
 * regular member; the chosen member becomes the single group leader.
 */
export async function transferLeadership(currentLeaderId: string, groupId: string, newLeaderUserId: string) {
  await requireGroupLeader(currentLeaderId, groupId);
  if (newLeaderUserId === currentLeaderId) return { ok: true };
  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: newLeaderUserId } },
  });
  if (!target) throw new GroupError("العضو غير موجود في المجموعة", "NOT_A_MEMBER", 404);
  await prisma.$transaction([
    prisma.group.update({ where: { id: groupId }, data: { leaderId: newLeaderUserId } }),
    prisma.groupMember.updateMany({ where: { groupId, userId: newLeaderUserId }, data: { role: "LEADER" } }),
    prisma.groupMember.updateMany({ where: { groupId, userId: currentLeaderId }, data: { role: "MEMBER" } }),
  ]);
  return { ok: true };
}

/**
 * A member leaves the group. If the LEADER leaves, leadership transfers to the
 * earliest-joined remaining member; if they're the last member, the group is
 * disbanded (deleted — cascades members + match rules).
 */
export async function leaveGroup(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new GroupError("المجموعة غير موجودة أو تم تعطيلها", "GROUP_NOT_FOUND", 404);

  if (group.leaderId === userId) {
    const next = await prisma.groupMember.findFirst({
      where: { groupId, userId: { not: userId } },
      orderBy: { joinedAt: "asc" },
    });
    if (!next) {
      // Last member → disband the whole group.
      await prisma.group.delete({ where: { id: groupId } });
      return { ok: true, disbanded: true };
    }
    // Hand leadership to the next member, then remove the outgoing leader.
    await prisma.$transaction([
      prisma.group.update({ where: { id: groupId }, data: { leaderId: next.userId } }),
      prisma.groupMember.update({ where: { id: next.id }, data: { role: "LEADER" } }),
      prisma.groupMember.deleteMany({ where: { groupId, userId } }),
    ]);
    return { ok: true, transferredTo: next.userId };
  }

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });
  return { ok: true };
}

// Member-facing: never exposes phone/employee identifiers.
// Shrinkage strength: how many "pseudo-members" (each scoring the global average)
// to blend in. Higher = small groups pulled harder toward the mean. 5 ≈ a typical
// small group, so a 2-person fluke can't top a large consistent group.
const TOP_GROUPS_K = 5;

/**
 * Rank groups FAIRLY across sizes using a Bayesian (shrinkage) average — the same
 * method as IMDb's weighted rating:
 *   fairScore = (sumMemberPoints + K·globalAvg) / (members + K)
 * Small groups are pulled toward the global average (no small-sample flukes);
 * large groups converge to their true average. Solo groups (< 2 members) are
 * excluded — that's an individual, not a group. Tie-breaks: total, members, name.
 */
export async function getTopGroups(limit = 50, minMembers = 2) {
  const [groups, entries] = await Promise.all([
    prisma.group.findMany({
      where: { isActive: true },
      select: { id: true, name: true, members: { select: { userId: true } } },
    }),
    prisma.leaderboardEntry.findMany({ select: { userId: true, totalPoints: true } }),
  ]);
  const pts = new Map(entries.map((e) => [e.userId, e.totalPoints]));
  const globalAvg = entries.length ? entries.reduce((s, e) => s + e.totalPoints, 0) / entries.length : 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const rows = groups
    .map((g) => {
      const memberCount = g.members.length;
      const totalPoints = g.members.reduce((s, m) => s + (pts.get(m.userId) ?? 0), 0);
      const avgPoints = memberCount > 0 ? round1(totalPoints / memberCount) : 0;
      const fairScore = round1((totalPoints + TOP_GROUPS_K * globalAvg) / (memberCount + TOP_GROUPS_K));
      return { id: g.id, name: g.name, memberCount, totalPoints, avgPoints, fairScore };
    })
    .filter((r) => r.memberCount >= minMembers);
  rows.sort(
    (a, b) => b.fairScore - a.fairScore || b.totalPoints - a.totalPoints || b.memberCount - a.memberCount || a.name.localeCompare(b.name),
  );
  return rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getGroupMembers(groupId: string) {
  return prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, department: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
}

/**
 * Group leaderboard, computed LIVE from each member's scored predictions and
 * this group's scoring config (defaults + per-match overrides + winner-only
 * mode). Reuses the point-independent correctness flags written during global
 * scoring, so points reflect the group's custom values without re-scoring.
 * Same tie-breakers as the global board.
 */
export async function getGroupLeaderboard(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { matchRules: true },
  });
  const base: GroupScoringConfig = {
    pointsExact: group?.pointsExact ?? 3,
    pointsOutcome: group?.pointsOutcome ?? 1,
    pointsQualifier: group?.pointsQualifier ?? 1,
    winnerOnly: group?.winnerOnly ?? false,
  };
  const ruleByMatch = new Map((group?.matchRules ?? []).map((r) => [r.matchId, r]));

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, department: true } } },
  });
  const ids = members.map((m) => m.userId);

  // All of these members' predictions; points come from the scored subset, while
  // totalPredictions / lastPredictionAt mirror the global board (count them all).
  const preds = await prisma.prediction.findMany({
    where: { userId: { in: ids } },
    select: {
      userId: true,
      matchId: true,
      pointsAwarded: true,
      isExactScore: true,
      isCorrectOutcome: true,
      isCorrectQualifier: true,
      submittedAt: true,
    },
  });

  type Agg = {
    totalPoints: number;
    exactScores: number;
    correctOutcomes: number;
    correctQualifiers: number;
    totalPredictions: number;
    scoredPredictions: number;
    lastPredictionAt: Date | null;
  };
  const agg = new Map<string, Agg>();
  for (const id of ids) {
    agg.set(id, {
      totalPoints: 0,
      exactScores: 0,
      correctOutcomes: 0,
      correctQualifiers: 0,
      totalPredictions: 0,
      scoredPredictions: 0,
      lastPredictionAt: null,
    });
  }

  for (const p of preds) {
    const a = agg.get(p.userId);
    if (!a) continue;
    a.totalPredictions += 1;
    if (!a.lastPredictionAt || p.submittedAt > a.lastPredictionAt) a.lastPredictionAt = p.submittedAt;
    if (p.pointsAwarded == null) continue; // not scored yet
    a.scoredPredictions += 1;
    const cfg = effectiveConfig(base, ruleByMatch.get(p.matchId));
    a.totalPoints += pointsForFlags(cfg, p);
    if (p.isExactScore) a.exactScores += 1;
    if (p.isCorrectOutcome) a.correctOutcomes += 1;
    if (p.isCorrectQualifier) a.correctQualifiers += 1;
  }

  const rows = members.map((m) => {
    const a = agg.get(m.userId)!;
    return {
      userId: m.userId,
      name: m.user.name,
      department: m.user.department,
      totalPoints: a.totalPoints,
      exactScores: a.exactScores,
      correctOutcomes: a.correctOutcomes,
      correctQualifiers: a.correctQualifiers,
      totalPredictions: a.totalPredictions,
      accuracy: a.scoredPredictions === 0 ? 0 : a.exactScores / a.scoredPredictions,
      lastPredictionAt: a.lastPredictionAt,
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

// ---- Per-group scoring (leader-customizable) --------------------------------

export interface GroupScoringInput {
  winnerOnly: boolean;
  pointsExact: number;
  pointsOutcome: number;
  pointsQualifier: number;
  overrides: Array<{
    matchId: string;
    pointsExact: number | null;
    pointsOutcome: number | null;
    pointsQualifier: number | null;
  }>;
}

/** Group scoring config + per-match rules (for the leader's settings screen). */
export async function getGroupScoring(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { matchRules: true },
  });
  if (!group) throw new GroupError("المجموعة غير موجودة", "GROUP_NOT_FOUND", 404);
  return {
    winnerOnly: group.winnerOnly,
    pointsExact: group.pointsExact,
    pointsOutcome: group.pointsOutcome,
    pointsQualifier: group.pointsQualifier,
    rules: group.matchRules.map((r) => ({
      matchId: r.matchId,
      pointsExact: r.pointsExact,
      pointsOutcome: r.pointsOutcome,
      pointsQualifier: r.pointsQualifier,
    })),
  };
}

/**
 * Leader saves the whole scoring config at once: group-wide defaults + mode, and
 * a full replacement of the per-match overrides. Rules with no non-null value are
 * dropped (they'd be identical to the default). Takes effect retroactively — the
 * group leaderboard recomputes live on next read.
 */
export async function saveGroupScoring(userId: string, groupId: string, input: GroupScoringInput) {
  await requireGroupLeader(userId, groupId);
  const keep = input.overrides.filter(
    (o) => o.pointsExact != null || o.pointsOutcome != null || o.pointsQualifier != null,
  );
  await prisma.$transaction(async (tx) => {
    await tx.group.update({
      where: { id: groupId },
      data: {
        winnerOnly: input.winnerOnly,
        pointsExact: input.pointsExact,
        pointsOutcome: input.pointsOutcome,
        pointsQualifier: input.pointsQualifier,
      },
    });
    await tx.groupMatchRule.deleteMany({ where: { groupId } });
    if (keep.length) {
      await tx.groupMatchRule.createMany({
        data: keep.map((o) => ({
          groupId,
          matchId: o.matchId,
          pointsExact: o.pointsExact,
          pointsOutcome: o.pointsOutcome,
          pointsQualifier: o.pointsQualifier,
        })),
      });
    }
  });
  return { ok: true };
}
