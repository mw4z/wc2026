import type { Stage, MatchStatus } from "@prisma/client";

export const KNOCKOUT_STAGES: Stage[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

export function isKnockoutStage(stage: Stage): boolean {
  return stage !== "GROUP";
}

// Arabic labels for UI copy. Codebase stays English; only display text is Arabic.
export const STAGE_LABEL_AR: Record<Stage, string> = {
  GROUP: "دور المجموعات",
  ROUND_OF_32: "دور الـ 32",
  ROUND_OF_16: "دور الـ 16",
  QUARTER_FINAL: "ربع النهائي",
  SEMI_FINAL: "نصف النهائي",
  THIRD_PLACE: "تحديد المركز الثالث",
  FINAL: "النهائي",
};

export const STATUS_LABEL_AR: Record<MatchStatus, string> = {
  SCHEDULED: "مفتوح للتوقع",
  LOCKED: "مُغلق",
  LIVE: "مباشر",
  FINISHED: "انتهت",
  SCORED: "تم الاحتساب",
  CANCELLED: "ملغاة",
};

// Official 104-match schedule imported (phase C). Set true only if reverting to
// sample/test fixtures.
export const SAMPLE_DATA = false;

export const UI = {
  appName: "توقعات كأس العالم 2026",
  sampleNotice:
    "⚠️ بيانات تجريبية: المباريات المعروضة حالياً للاختبار فقط وليست الجدول الرسمي لكأس العالم.",
  matches: "المباريات",
  todayMatches: "مباريات اليوم",
  upcomingMatches: "المباريات القادمة",
  finishedMatches: "المباريات المنتهية",
  leaderboard: "لوحة المتصدرين",
  submitPrediction: "أرسل توقعك",
  predictionClosed: "تم إغلاق التوقع",
  closesAtKickoff: "يُغلق التوقع عند بداية المباراة",
  exactScore: "النتيجة الدقيقة",
  predictedWinner: "الفائز المتوقع",
  rules: "القواعد",
  adminPanel: "لوحة الإدارة",
  dashboard: "الرئيسية",
  profile: "ملفي",
  login: "تسجيل الدخول",
  logout: "تسجيل الخروج",
  phone: "رقم الجوال",
  rank: "الترتيب",
  name: "الاسم",
  department: "الإدارة",
  totalPoints: "مجموع النقاط",
  save: "حفظ",
  home: "المضيف",
  away: "الضيف",
  city: "المدينة",
  stadium: "الملعب",
  kickoff: "موعد المباراة",
  yourPrediction: "توقعك",
  locksIn: "يُغلق خلال",
  vs: "×",
  // Match detail page
  matchDetails: "تفاصيل المباراة",
  backToMatches: "العودة إلى المباريات",
  predictionDistribution: "توزيع توقعات المشاركين",
  distributionAfterLock: "تظهر هذه الإحصائية بعد إغلاق التوقع",
  noPredictionsYet: "لم يتوقّع أحد هذه المباراة",
  predictionsCount: "عدد التوقعات",
  outcomeHomeWin: "فوز المضيف",
  outcomeDraw: "تعادل",
  outcomeAwayWin: "فوز الضيف",
  finalResult: "النتيجة النهائية",
  // Groups (Phase D)
  groups: "المجموعات",
  joinGroup: "انضم إلى مجموعة",
  createGroup: "إنشاء مجموعة",
  groupName: "اسم المجموعة",
  groupCode: "كود المجموعة",
  groupLeader: "قائد المجموعة",
  groupMembers: "أعضاء المجموعة",
  groupRanking: "ترتيب المجموعة",
  copyCode: "نسخ الكود",
  codeCopied: "تم نسخ الكود",
  regenerateCode: "تجديد الكود",
  leaveGroup: "مغادرة المجموعة",
  removeMember: "إزالة عضو",
  notGroupLeader: "لا تملك صلاحية إدارة هذه المجموعة",
  groupNotFound: "المجموعة غير موجودة أو تم تعطيلها",
  alreadyMember: "أنت عضو بالفعل في هذه المجموعة",
} as const;
