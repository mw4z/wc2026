/**
 * Scoring algorithm — pure, deterministic, fully server-side.
 *
 * Group stage:
 *   - Exact score:        3 points
 *   - Correct outcome:    1 point   (home win / draw / away win)
 *   - Wrong:              0 points
 *
 * Knockout stage:
 *   - Exact score (pre-penalties):          3 points
 *   - Correct outcome (pre-penalties):      1 point
 *   - Correct qualified team:              +1 point
 *   - Max per knockout match:               4 points
 *
 * IMPORTANT: score-based outcome is judged on the result BEFORE any penalty
 * shootout. The qualified team is scored separately (penalties decide it).
 * A knockout match that is a draw on the scoreboard but has a qualifier is
 * therefore valid and fully supported.
 */

export type Outcome = "HOME" | "DRAW" | "AWAY";

export function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

export interface ScoreInput {
  isKnockout: boolean;
  // Actual result (pre-penalties)
  actualHome: number;
  actualAway: number;
  actualWinnerTeamId: string | null; // qualified team (knockout only)
  // Prediction
  predHome: number;
  predAway: number;
  predWinnerTeamId: string | null;
}

export interface ScoreResult {
  points: number;
  isExactScore: boolean;
  isCorrectOutcome: boolean;
  isCorrectQualifier: boolean;
}

export function calculatePredictionPoints(input: ScoreInput): ScoreResult {
  const {
    isKnockout,
    actualHome,
    actualAway,
    actualWinnerTeamId,
    predHome,
    predAway,
    predWinnerTeamId,
  } = input;

  const isExactScore = predHome === actualHome && predAway === actualAway;
  const isCorrectOutcome =
    outcomeOf(predHome, predAway) === outcomeOf(actualHome, actualAway);

  // Exact score implies correct outcome; points don't stack (3 already covers it).
  let points = isExactScore ? 3 : isCorrectOutcome ? 1 : 0;

  // Qualifier is only meaningful for knockout matches with a recorded winner.
  let isCorrectQualifier = false;
  if (isKnockout && actualWinnerTeamId != null && predWinnerTeamId != null) {
    isCorrectQualifier = predWinnerTeamId === actualWinnerTeamId;
    if (isCorrectQualifier) points += 1;
  }

  // Safety clamp (knockout max 4, group max 3).
  const max = isKnockout ? 4 : 3;
  if (points > max) points = max;

  return { points, isExactScore, isCorrectOutcome, isCorrectQualifier };
}
