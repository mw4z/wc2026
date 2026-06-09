import { prisma } from "./prisma";

const REGISTRATION_OPEN = "registration_open";

export async function isRegistrationOpen(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: REGISTRATION_OPEN } });
  // Default to open if never configured.
  return row ? row.value === "true" : true;
}

export async function setRegistrationOpen(open: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: REGISTRATION_OPEN },
    update: { value: String(open) },
    create: { key: REGISTRATION_OPEN, value: String(open) },
  });
}

// --- Prediction opening window (global) ---
// How long before kickoff predictions open. "always" = current behavior (open
// as soon as the match is SCHEDULED). Otherwise N hours before kickoff.
const PREDICTION_LEAD = "prediction_open_lead";
export type PredictionLead = "always" | "24" | "12" | "6" | "2";
const LEADS: PredictionLead[] = ["always", "24", "12", "6", "2"];

export async function getPredictionLead(): Promise<PredictionLead> {
  const row = await prisma.setting.findUnique({ where: { key: PREDICTION_LEAD } });
  return (LEADS as string[]).includes(row?.value ?? "") ? (row!.value as PredictionLead) : "always";
}

export async function setPredictionLead(value: PredictionLead): Promise<void> {
  await prisma.setting.upsert({
    where: { key: PREDICTION_LEAD },
    update: { value },
    create: { key: PREDICTION_LEAD, value },
  });
}

export function predictionLeadHours(value: PredictionLead): number | null {
  return value === "always" ? null : parseInt(value, 10);
}

/** When predictions open for a match, or null if "always open". */
export function predictionOpensAt(kickoffAt: Date, value: PredictionLead): Date | null {
  const h = predictionLeadHours(value);
  return h == null ? null : new Date(kickoffAt.getTime() - h * 3600_000);
}
