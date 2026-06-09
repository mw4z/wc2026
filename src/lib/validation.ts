import { z } from "zod";

const score = z.coerce.number().int().min(0).max(99);

export const loginSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  employeeId: z
    .string()
    .trim()
    .min(1, "الرقم الوظيفي مطلوب")
    .max(40)
    .regex(/^[A-Za-z0-9._-]+$/, "الرقم الوظيفي يحتوي على رموز غير مسموحة"),
  department: z.string().trim().max(80).optional().or(z.literal("")),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Step 1: email entry (no name). The server emails an OTP; on verify it logs in
// if the email exists, else opens a pending signup. Email is the identity.
export const emailStartSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صحيح").max(120),
});
export type EmailStartInput = z.infer<typeof emailStartSchema>;

// Email OTP code (Authentica). 4–8 digits to tolerate provider length changes.
export const otpVerifySchema = z.object({
  otp: z.string().trim().regex(/^\d{4,8}$/, "رمز التحقق غير صحيح"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

// Step 2: complete signup (phone comes from the pending cookie, never the body).
export const signupCompleteSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  groupCode: z.string().trim().max(40).optional().or(z.literal("")),
  newGroupName: z.string().trim().max(60).optional().or(z.literal("")),
});
export type SignupCompleteInput = z.infer<typeof signupCompleteSchema>;

export const predictionSchema = z.object({
  matchId: z.string().min(1),
  predictedHomeScore: score,
  predictedAwayScore: score,
  // Required by the server only for knockout matches; validated in the handler.
  predictedWinnerTeamId: z.string().min(1).nullable().optional(),
});
export type PredictionInput = z.infer<typeof predictionSchema>;

export const matchResultSchema = z.object({
  homeScore: score,
  awayScore: score,
  wentToPenalties: z.boolean().optional().default(false),
  winnerTeamId: z.string().min(1).nullable().optional(),
});
export type MatchResultInput = z.infer<typeof matchResultSchema>;

export const stageEnum = z.enum([
  "GROUP",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

export const groupCreateSchema = z.object({
  name: z.string().trim().min(2, "اسم المجموعة قصير جدًا").max(60),
});

export const groupJoinSchema = z.object({
  code: z.string().trim().min(1, "أدخل كود المجموعة").max(40),
});

export const groupRenameSchema = z.object({
  name: z.string().trim().min(2, "اسم المجموعة قصير جدًا").max(60),
});

// Per-group scoring config saved by the leader. Point values are small ints;
// `overrides` fully replaces the group's per-match rules (null = use default).
const pts = z.coerce.number().int().min(0).max(50);
export const groupScoringSchema = z.object({
  winnerOnly: z.boolean(),
  pointsExact: pts,
  pointsOutcome: pts,
  pointsQualifier: pts,
  overrides: z
    .array(
      z.object({
        matchId: z.string().min(1),
        pointsExact: pts.nullable(),
        pointsOutcome: pts.nullable(),
        pointsQualifier: pts.nullable(),
      }),
    )
    .max(300)
    .default([]),
});
export type GroupScoringFormInput = z.infer<typeof groupScoringSchema>;

export const matchUpsertSchema = z.object({
  matchNumber: z.coerce.number().int().positive(),
  stage: stageEnum,
  homeTeamCode: z.string().trim().min(1),
  awayTeamCode: z.string().trim().min(1),
  kickoffAt: z.string().datetime({ message: "صيغة التاريخ غير صحيحة (ISO 8601)" }),
  city: z.string().trim().optional().or(z.literal("")),
  stadium: z.string().trim().optional().or(z.literal("")),
});
export type MatchUpsertInput = z.infer<typeof matchUpsertSchema>;
