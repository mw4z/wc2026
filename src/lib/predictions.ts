import { prisma } from "./prisma";
import { isKnockoutStage } from "./constants";
import { isKickoffReached } from "./time";
import type { PredictionInput } from "./validation";

export class PredictionError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

/**
 * Server-side gate. The ONLY source of truth for whether a prediction may be
 * created/updated. Frontend countdowns are cosmetic — every write passes here.
 */
export function lockPredictionGuard(match: {
  status: string;
  kickoffAt: Date;
  homeTeamId: string | null;
  awayTeamId: string | null;
}): void {
  if (match.status !== "SCHEDULED") {
    throw new PredictionError("التوقع مُغلق لهذه المباراة", "MATCH_NOT_OPEN", 409);
  }
  if (isKickoffReached(match.kickoffAt)) {
    throw new PredictionError("تم إغلاق التوقع عند بداية المباراة", "KICKOFF_REACHED", 409);
  }
  if (!match.homeTeamId || !match.awayTeamId) {
    throw new PredictionError("لم يتم تحديد الفريقين بعد", "TEAMS_TBD", 409);
  }
}

/**
 * Create or update a prediction (one per user per match). Runs atomically:
 * re-reads the match inside the transaction, re-checks the lock, upserts, and
 * writes an audit-log row. This closes the "opened before kickoff, submitted
 * after kickoff" race — the guard uses the transaction's read, not the page load.
 */
export async function submitPrediction(userId: string, input: PredictionInput) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: input.matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new PredictionError("المباراة غير موجودة", "MATCH_NOT_FOUND", 404);

    lockPredictionGuard(match);

    const knockout = isKnockoutStage(match.stage);
    let winnerTeamId: string | null = null;
    if (knockout) {
      if (!input.predictedWinnerTeamId) {
        throw new PredictionError(
          "يجب اختيار الفريق المتأهل لمباريات الأدوار الإقصائية",
          "WINNER_REQUIRED",
        );
      }
      // The predicted winner must be one of the two teams in this match.
      if (
        input.predictedWinnerTeamId !== match.homeTeamId &&
        input.predictedWinnerTeamId !== match.awayTeamId
      ) {
        throw new PredictionError("الفريق المتأهل غير صحيح", "WINNER_INVALID");
      }
      winnerTeamId = input.predictedWinnerTeamId;
    }

    const existing = await tx.prediction.findUnique({
      where: { userId_matchId: { userId, matchId: input.matchId } },
    });

    const data = {
      predictedHomeScore: input.predictedHomeScore,
      predictedAwayScore: input.predictedAwayScore,
      predictedWinnerTeamId: winnerTeamId,
    };

    const prediction = existing
      ? await tx.prediction.update({ where: { id: existing.id }, data })
      : await tx.prediction.create({
          data: { userId, matchId: input.matchId, ...data },
        });

    await tx.predictionAuditLog.create({
      data: {
        predictionId: prediction.id,
        userId,
        matchId: input.matchId,
        action: existing ? "UPDATE" : "CREATE",
        oldValue: existing
          ? {
              predictedHomeScore: existing.predictedHomeScore,
              predictedAwayScore: existing.predictedAwayScore,
              predictedWinnerTeamId: existing.predictedWinnerTeamId,
            }
          : undefined,
        newValue: data,
      },
    });

    return prediction;
  });
}

/** A user's own prediction for a match (always allowed to read their own). */
export async function getMyPrediction(userId: string, matchId: string) {
  return prisma.prediction.findUnique({
    where: { userId_matchId: { userId, matchId } },
  });
}

/**
 * Prediction distribution — only exposed AFTER the match locks, to avoid
 * influencing other users. Returns outcome percentages.
 */
export async function getPredictionStatsAfterLock(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new PredictionError("المباراة غير موجودة", "MATCH_NOT_FOUND", 404);

  const locked = match.status !== "SCHEDULED" || isKickoffReached(match.kickoffAt);
  if (!locked) {
    throw new PredictionError("الإحصائيات تظهر بعد إغلاق التوقع", "NOT_LOCKED_YET", 409);
  }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { predictedHomeScore: true, predictedAwayScore: true },
  });

  const total = predictions.length;
  let home = 0;
  let draw = 0;
  let away = 0;
  for (const p of predictions) {
    if (p.predictedHomeScore > p.predictedAwayScore) home++;
    else if (p.predictedHomeScore < p.predictedAwayScore) away++;
    else draw++;
  }
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return {
    total,
    homeWinPct: pct(home),
    drawPct: pct(draw),
    awayWinPct: pct(away),
  };
}
