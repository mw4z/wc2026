// Per-group scoring. The GLOBAL leaderboard always uses the standard 3/1/+1
// (see scoring.ts). A group leader can override the point VALUES for their own
// group — and because each prediction already stores point-independent
// correctness flags (isExactScore / isCorrectOutcome / isCorrectQualifier),
// the group leaderboard is recomputed live from those flags + the group config.
// No re-scoring of predictions is needed.

export interface GroupScoringConfig {
  pointsExact: number;
  pointsOutcome: number;
  pointsQualifier: number;
  winnerOnly: boolean;
}

export interface PredictionFlags {
  isExactScore: boolean;
  isCorrectOutcome: boolean;
  isCorrectQualifier: boolean;
}

export const STANDARD_SCORING: GroupScoringConfig = {
  pointsExact: 3,
  pointsOutcome: 1,
  pointsQualifier: 1,
  winnerOnly: false,
};

// Per-match override: any null field falls back to the group default. The mode
// (winnerOnly) is group-wide, not overridable per match.
export interface MatchRuleOverride {
  pointsExact: number | null;
  pointsOutcome: number | null;
  pointsQualifier: number | null;
}

/** Resolve the effective config for one match given the group defaults + an optional override. */
export function effectiveConfig(
  base: GroupScoringConfig,
  override?: MatchRuleOverride | null,
): GroupScoringConfig {
  if (!override) return base;
  return {
    pointsExact: override.pointsExact ?? base.pointsExact,
    pointsOutcome: override.pointsOutcome ?? base.pointsOutcome,
    pointsQualifier: override.pointsQualifier ?? base.pointsQualifier,
    winnerOnly: base.winnerOnly,
  };
}

/**
 * Points a single (already-scored) prediction earns under a given config.
 * In winner-only mode the exact-score bonus is ignored — a correct result earns
 * pointsOutcome whether or not the score was exact. The qualifier bonus (knockout)
 * is added on top, exactly like the global algorithm.
 */
export function pointsForFlags(cfg: GroupScoringConfig, flags: PredictionFlags): number {
  let pts: number;
  if (cfg.winnerOnly) {
    pts = flags.isCorrectOutcome ? cfg.pointsOutcome : 0;
  } else {
    pts = flags.isExactScore ? cfg.pointsExact : flags.isCorrectOutcome ? cfg.pointsOutcome : 0;
  }
  if (flags.isCorrectQualifier) pts += cfg.pointsQualifier;
  return pts;
}

/** True when a group's scoring differs from the standard 3/1/+1 (full-score) preset. */
export function isCustomScoring(cfg: GroupScoringConfig): boolean {
  return (
    cfg.winnerOnly ||
    cfg.pointsExact !== STANDARD_SCORING.pointsExact ||
    cfg.pointsOutcome !== STANDARD_SCORING.pointsOutcome ||
    cfg.pointsQualifier !== STANDARD_SCORING.pointsQualifier
  );
}
