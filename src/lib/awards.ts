import { prisma } from "./prisma";

// Tournament awards: optional, leader-toggled, SEPARATE from match predictions.
// One pick per user per award (global). Fixed 3 points per correct pick. Locks at
// tournament start. Never touches the match leaderboard.

export const AWARD_POINTS = 3;

export class AwardError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

/**
 * When award predictions lock. Priority:
 *   1) Setting "awards_lock_at" (ISO) if an admin set one, else
 *   2) the earliest match kickoff (tournament start).
 * Returns null only if there are no matches at all (then nothing locks).
 */
export async function getAwardsLockAt(): Promise<Date | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "awards_lock_at" } });
  if (setting?.value) {
    const d = new Date(setting.value);
    if (!isNaN(d.getTime())) return d;
  }
  const first = await prisma.match.findFirst({ orderBy: { kickoffAt: "asc" }, select: { kickoffAt: true } });
  return first?.kickoffAt ?? null;
}

export async function isAwardsLocked(): Promise<boolean> {
  const at = await getAwardsLockAt();
  return at != null && Date.now() >= at.getTime();
}

/** A member may use awards only if at least one of their active groups enabled it. */
export async function userCanUseAwards(userId: string): Promise<boolean> {
  const m = await prisma.groupMember.findFirst({
    where: { userId, group: { isActive: true, awardsEnabled: true } },
    select: { id: true },
  });
  return !!m;
}

export async function getActiveAwards() {
  return prisma.award.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { candidates: { orderBy: { nameEn: "asc" } } },
  });
}

export async function getMyAwardPredictions(userId: string) {
  const rows = await prisma.awardPrediction.findMany({ where: { userId } });
  return new Map(rows.map((r) => [r.awardId, r]));
}

/** How many active awards the user has picked, out of the total — for the promo CTA. */
export async function getAwardsProgress(userId: string): Promise<{ predicted: number; total: number }> {
  const awards = await prisma.award.findMany({ where: { isActive: true }, select: { id: true } });
  const ids = awards.map((a) => a.id);
  const predicted = ids.length
    ? await prisma.awardPrediction.count({ where: { userId, awardId: { in: ids } } })
    : 0;
  return { predicted, total: awards.length };
}

/** Submit/replace a member's pick for one award. Server-enforces the lock. */
export async function submitAwardPrediction(userId: string, awardId: string, candidateId: string) {
  if (await isAwardsLocked()) {
    throw new AwardError("أُغلق التوقع على الجوائز (بدأت البطولة)", "AWARDS_LOCKED", 409);
  }
  const award = await prisma.award.findUnique({ where: { id: awardId }, include: { candidates: true } });
  if (!award || !award.isActive) throw new AwardError("الجائزة غير موجودة", "AWARD_NOT_FOUND", 404);
  if (!award.candidates.some((c) => c.id === candidateId)) {
    throw new AwardError("المرشّح غير صحيح", "CANDIDATE_INVALID", 422);
  }
  if (!(await userCanUseAwards(userId))) {
    throw new AwardError("توقعات الجوائز غير مفعّلة في مجموعتك", "AWARDS_DISABLED", 403);
  }
  return prisma.awardPrediction.upsert({
    where: { userId_awardId: { userId, awardId } },
    create: { userId, awardId, candidateId },
    update: { candidateId },
  });
}

// ---- Admin: candidates, winner, scoring ----

export async function adminListAwards() {
  return prisma.award.findMany({ orderBy: { sortOrder: "asc" }, include: { candidates: { orderBy: { nameEn: "asc" } } } });
}

export async function addCandidate(awardId: string, nameAr: string, nameEn: string, team?: string | null) {
  const award = await prisma.award.findUnique({ where: { id: awardId } });
  if (!award) throw new AwardError("الجائزة غير موجودة", "AWARD_NOT_FOUND", 404);
  return prisma.awardCandidate.create({ data: { awardId, nameAr: nameAr.trim(), nameEn: nameEn.trim(), team: team?.trim() || null } });
}

export async function deleteCandidate(candidateId: string) {
  await prisma.awardCandidate.delete({ where: { id: candidateId } });
}

/**
 * Set (or clear) the official winner for an award and (re)score every prediction.
 * Idempotent — safe to re-run / correct. winnerCandidateId=null clears scoring.
 */
export async function setAwardWinner(awardId: string, winnerCandidateId: string | null) {
  const award = await prisma.award.findUnique({ where: { id: awardId }, include: { candidates: true } });
  if (!award) throw new AwardError("الجائزة غير موجودة", "AWARD_NOT_FOUND", 404);
  if (winnerCandidateId && !award.candidates.some((c) => c.id === winnerCandidateId)) {
    throw new AwardError("المرشّح غير صحيح", "CANDIDATE_INVALID", 422);
  }

  await prisma.award.update({ where: { id: awardId }, data: { winnerCandidateId } });

  const preds = await prisma.awardPrediction.findMany({ where: { awardId } });
  await prisma.$transaction(
    preds.map((p) => {
      const correct = winnerCandidateId != null && p.candidateId === winnerCandidateId;
      return prisma.awardPrediction.update({
        where: { id: p.id },
        data: { isCorrect: correct, pointsAwarded: winnerCandidateId == null ? null : correct ? AWARD_POINTS : 0 },
      });
    }),
  );
  return { scored: preds.length };
}

// ---- Per-group awards board (separate from the match leaderboard) ----

export interface AwardBoardRow {
  userId: string;
  name: string;
  points: number;
  correct: number;
  predictions: number;
  lastAt: Date;
  rank: number;
}

export async function getGroupAwardsBoard(groupId: string): Promise<AwardBoardRow[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });
  const ids = members.map((m) => m.userId);
  const preds = await prisma.awardPrediction.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, pointsAwarded: true, isCorrect: true, submittedAt: true },
  });

  const agg = new Map<string, { points: number; correct: number; predictions: number; lastAt: Date }>();
  for (const m of members) agg.set(m.userId, { points: 0, correct: 0, predictions: 0, lastAt: new Date(0) });
  for (const p of preds) {
    const a = agg.get(p.userId);
    if (!a) continue;
    a.predictions++;
    if (p.pointsAwarded != null) a.points += p.pointsAwarded;
    if (p.isCorrect) a.correct++;
    if (p.submittedAt > a.lastAt) a.lastAt = p.submittedAt;
  }

  const rows = members.map((m) => {
    const a = agg.get(m.userId)!;
    return { userId: m.userId, name: m.user.name, ...a };
  });
  // Sort: points desc, then correct desc, then earliest last-submission, then name.
  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.correct - x.correct ||
      x.lastAt.getTime() - y.lastAt.getTime() ||
      x.name.localeCompare(y.name),
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
