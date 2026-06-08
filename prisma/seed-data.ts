// Shared seed data — imported by prisma/seed.ts (Prisma client seeding) and by
// scripts/gen-seed-sql.ts (raw SQL generation for the Supabase SQL Editor).
// 48 teams + group assignments from the official WC2026 draw.

export interface SeedTeam {
  code: string;
  nameEn: string;
  nameAr: string;
  group: string;
}

export const TEAMS: SeedTeam[] = [
  // Group A
  { code: "MEX", nameEn: "Mexico", nameAr: "المكسيك", group: "A" },
  { code: "RSA", nameEn: "South Africa", nameAr: "جنوب أفريقيا", group: "A" },
  { code: "KOR", nameEn: "South Korea", nameAr: "كوريا الجنوبية", group: "A" },
  { code: "CZE", nameEn: "Czech Republic", nameAr: "التشيك", group: "A" },
  // Group B
  { code: "CAN", nameEn: "Canada", nameAr: "كندا", group: "B" },
  { code: "BIH", nameEn: "Bosnia & Herzegovina", nameAr: "البوسنة", group: "B" },
  { code: "QAT", nameEn: "Qatar", nameAr: "قطر", group: "B" },
  { code: "SUI", nameEn: "Switzerland", nameAr: "سويسرا", group: "B" },
  // Group C
  { code: "BRA", nameEn: "Brazil", nameAr: "البرازيل", group: "C" },
  { code: "MAR", nameEn: "Morocco", nameAr: "المغرب", group: "C" },
  { code: "HAI", nameEn: "Haiti", nameAr: "هايتي", group: "C" },
  { code: "SCO", nameEn: "Scotland", nameAr: "إسكتلندا", group: "C" },
  // Group D
  { code: "USA", nameEn: "United States", nameAr: "أمريكا", group: "D" },
  { code: "PAR", nameEn: "Paraguay", nameAr: "باراغواي", group: "D" },
  { code: "AUS", nameEn: "Australia", nameAr: "أستراليا", group: "D" },
  { code: "TUR", nameEn: "Turkey", nameAr: "تركيا", group: "D" },
  // Group E
  { code: "GER", nameEn: "Germany", nameAr: "ألمانيا", group: "E" },
  { code: "CUW", nameEn: "Curaçao", nameAr: "كوراساو", group: "E" },
  { code: "CIV", nameEn: "Ivory Coast", nameAr: "ساحل العاج", group: "E" },
  { code: "ECU", nameEn: "Ecuador", nameAr: "الإكوادور", group: "E" },
  // Group F
  { code: "NED", nameEn: "Netherlands", nameAr: "هولندا", group: "F" },
  { code: "JPN", nameEn: "Japan", nameAr: "اليابان", group: "F" },
  { code: "SWE", nameEn: "Sweden", nameAr: "السويد", group: "F" },
  { code: "TUN", nameEn: "Tunisia", nameAr: "تونس", group: "F" },
  // Group G
  { code: "BEL", nameEn: "Belgium", nameAr: "بلجيكا", group: "G" },
  { code: "EGY", nameEn: "Egypt", nameAr: "مصر", group: "G" },
  { code: "IRN", nameEn: "Iran", nameAr: "إيران", group: "G" },
  { code: "NZL", nameEn: "New Zealand", nameAr: "نيوزيلندا", group: "G" },
  // Group H
  { code: "ESP", nameEn: "Spain", nameAr: "إسبانيا", group: "H" },
  { code: "CPV", nameEn: "Cape Verde", nameAr: "الرأس الأخضر", group: "H" },
  { code: "KSA", nameEn: "Saudi Arabia", nameAr: "السعودية", group: "H" },
  { code: "URU", nameEn: "Uruguay", nameAr: "أوروغواي", group: "H" },
  // Group I
  { code: "FRA", nameEn: "France", nameAr: "فرنسا", group: "I" },
  { code: "SEN", nameEn: "Senegal", nameAr: "السنغال", group: "I" },
  { code: "IRQ", nameEn: "Iraq", nameAr: "العراق", group: "I" },
  { code: "NOR", nameEn: "Norway", nameAr: "النرويج", group: "I" },
  // Group J
  { code: "ARG", nameEn: "Argentina", nameAr: "الأرجنتين", group: "J" },
  { code: "ALG", nameEn: "Algeria", nameAr: "الجزائر", group: "J" },
  { code: "AUT", nameEn: "Austria", nameAr: "النمسا", group: "J" },
  { code: "JOR", nameEn: "Jordan", nameAr: "الأردن", group: "J" },
  // Group K
  { code: "POR", nameEn: "Portugal", nameAr: "البرتغال", group: "K" },
  { code: "COD", nameEn: "DR Congo", nameAr: "الكونغو", group: "K" },
  { code: "UZB", nameEn: "Uzbekistan", nameAr: "أوزبكستان", group: "K" },
  { code: "COL", nameEn: "Colombia", nameAr: "كولومبيا", group: "K" },
  // Group L
  { code: "ENG", nameEn: "England", nameAr: "إنجلترا", group: "L" },
  { code: "CRO", nameEn: "Croatia", nameAr: "كرواتيا", group: "L" },
  { code: "GHA", nameEn: "Ghana", nameAr: "غانا", group: "L" },
  { code: "PAN", nameEn: "Panama", nameAr: "بنما", group: "L" },
];
