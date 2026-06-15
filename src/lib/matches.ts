import { prisma } from "./prisma";
import { isKnockoutStage } from "./constants";
import { calculatePredictionPoints } from "./scoring";
import { recalculateLeaderboard } from "./leaderboard";
import { snapshotAllRanks } from "./rankMovement";
import { notifyMatchScored } from "./notifications";
import type { MatchResultInput } from "./validation";

export class MatchError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

/**
 * Admin enters/edits a final result. Validates knockout invariants, records an
 * audit row (admin id + before/after), sets the match to FINISHED, then
 * (re)scores every prediction. Safe to call again after points already exist —
 * scoring is idempotent and overwrites prior pointsAwarded.
 */
export async function updateMatchResult(
  adminUserId: string,
  matchId: string,
  input: MatchResultInput,
) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new MatchError("المباراة غير موجودة", "MATCH_NOT_FOUND", 404);

  const knockout = isKnockoutStage(match.stage);
  let winnerTeamId: string | null = null;

  if (knockout) {
    if (!input.winnerTeamId) {
      throw new MatchError("يجب تحديد الفريق المتأهل", "WINNER_REQUIRED");
    }
    if (input.winnerTeamId !== match.homeTeamId && input.winnerTeamId !== match.awayTeamId) {
      throw new MatchError("الفريق المتأهل غير صحيح", "WINNER_INVALID");
    }
    winnerTeamId = input.winnerTeamId;
    // A non-draw score with a winner that contradicts the score is suspicious
    // unless penalties were involved — block the obvious mistake.
    const scoreWinnerIsHome = input.homeScore > input.awayScore;
    const scoreWinnerIsAway = input.homeScore < input.awayScore;
    if (!input.wentToPenalties) {
      if (scoreWinnerIsHome && winnerTeamId !== match.homeTeamId) {
        throw new MatchError("المتأهل لا يطابق النتيجة (بدون ركلات ترجيح)", "WINNER_MISMATCH");
      }
      if (scoreWinnerIsAway && winnerTeamId !== match.awayTeamId) {
        throw new MatchError("المتأهل لا يطابق النتيجة (بدون ركلات ترجيح)", "WINNER_MISMATCH");
      }
    }
  }

  const oldValue = {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    wentToPenalties: match.wentToPenalties,
    winnerTeamId: match.winnerTeamId,
    status: match.status,
  };
  const newValue = {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    wentToPenalties: input.wentToPenalties ?? false,
    winnerTeamId,
    status: "FINISHED" as const,
  };

  const wasScored = match.status === "SCORED";

  await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      // Manual entry is the override path: stamp the source and clear any
      // provider "needs review" flag. (Scoring itself is unchanged.)
      data: { ...newValue, resultConfirmedAt: new Date(), resultSource: "manual", needsReview: false },
    }),
    prisma.matchResultAuditLog.create({
      data: {
        matchId,
        adminUserId,
        action: wasScored ? "UPDATE" : "CREATE",
        oldValue,
        newValue,
      },
    }),
  ]);

  // Score immediately so admins get one-click "enter result → points".
  await calculateMatchPoints(matchId, adminUserId);

  return prisma.match.findUnique({ where: { id: matchId } });
}

/**
 * Score every prediction for a single match and flip status to SCORED.
 * Idempotent: re-running recomputes from the current result. Used both on
 * result entry and on the admin "recalculate this match" action.
 */
export async function calculateMatchPoints(matchId: string, adminUserId?: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new MatchError("المباراة غير موجودة", "MATCH_NOT_FOUND", 404);
  if (match.homeScore == null || match.awayScore == null) {
    throw new MatchError("لا توجد نتيجة لاحتسابها", "NO_RESULT", 409);
  }

  const knockout = isKnockoutStage(match.stage);
  const predictions = await prisma.prediction.findMany({ where: { matchId } });

  const updates = predictions.map((p) => {
    const r = calculatePredictionPoints({
      isKnockout: knockout,
      actualHome: match.homeScore!,
      actualAway: match.awayScore!,
      actualWinnerTeamId: match.winnerTeamId,
      predHome: p.predictedHomeScore,
      predAway: p.predictedAwayScore,
      predWinnerTeamId: p.predictedWinnerTeamId,
    });
    return prisma.prediction.update({
      where: { id: p.id },
      data: {
        pointsAwarded: r.points,
        isExactScore: r.isExactScore,
        isCorrectOutcome: r.isCorrectOutcome,
        isCorrectQualifier: r.isCorrectQualifier,
      },
    });
  });

  await prisma.$transaction([
    ...updates,
    prisma.match.update({ where: { id: matchId }, data: { status: "SCORED" } }),
  ]);

  if (adminUserId) {
    await prisma.matchResultAuditLog.create({
      data: { matchId, adminUserId, action: "SCORE", newValue: { scored: predictions.length } },
    });
  }

  // Keep the leaderboard consistent after any scoring change.
  await recalculateLeaderboard();
  // Snapshot ranks so the boards can show each member's ▲/▼ vs before this match.
  // Best-effort — never block scoring on the movement bookkeeping.
  try {
    await snapshotAllRanks();
  } catch (e) {
    console.error("[scoring] rank snapshot failed:", (e as Error).message);
  }

  // Push each predictor their result immediately (deduped so the hourly cron
  // won't repeat it). Best-effort — never blocks/aborts scoring.
  await notifyMatchScored(matchId);

  return { scored: predictions.length };
}

/**
 * Lock matches whose kickoff has passed but are still SCHEDULED. Safe to call
 * from a cron or on admin page load. (Predictions are already blocked by the
 * server guard regardless of status; this just keeps status display accurate.)
 */
export async function lockDueMatches() {
  const now = new Date();
  const res = await prisma.match.updateMany({
    where: { status: "SCHEDULED", kickoffAt: { lte: now } },
    data: { status: "LOCKED" },
  });
  return res.count;
}
