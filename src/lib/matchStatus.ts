import { isKickoffReached } from "./time";
import { predictionOpensAt, type PredictionLead } from "./settings";

// The status to SHOW for a match, accounting for the global prediction-opening
// window. The raw DB status alone is misleading: a SCHEDULED match isn't really
// "open for predictions" until its opensAt window has started. Mirrors the logic
// the public MatchCard uses, so admin views match what players see.
export type EffectiveStatus =
  | "SCORED"
  | "FINISHED"
  | "LIVE"
  | "CANCELLED"
  | "LOCKED"
  | "NOT_OPEN_YET"
  | "SCHEDULED";

export function effectiveMatchStatus(
  m: { status: string; kickoffAt: Date },
  lead: PredictionLead,
  now: Date = new Date(),
): EffectiveStatus {
  if (m.status === "SCORED") return "SCORED";
  if (m.status === "FINISHED") return "FINISHED";
  if (m.status === "LIVE") return "LIVE";
  if (m.status === "CANCELLED") return "CANCELLED";
  // Past kickoff (or already locked) → closed.
  if (m.status === "LOCKED" || isKickoffReached(m.kickoffAt, now)) return "LOCKED";
  // Scheduled but the prediction window hasn't opened yet.
  const opensAt = predictionOpensAt(m.kickoffAt, lead);
  if (opensAt && now.getTime() < opensAt.getTime()) return "NOT_OPEN_YET";
  return "SCHEDULED";
}
