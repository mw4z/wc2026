// Shared seed data — imported by prisma/seed.ts (Prisma client seeding) and by
// scripts/gen-seed-sql.ts (raw SQL generation for the Supabase SQL Editor).
// 48 teams + group assignments from the official WC2026 draw.
//
// `iso` = flag-icons code (ISO 3166-1 alpha-2, plus gb-eng / gb-sct for the home
// nations). Flag SVGs are copied to /public/flags/<iso>.svg by scripts/copy-flags.ts.

export interface SeedTeam {
  code: string; // FIFA 3-letter
  nameEn: string;
  nameAr: string;
  group: string;
  iso: string; // flag-icons code
}

export const TEAMS: SeedTeam[] = [
  // Group A
  { code: "MEX", nameEn: "Mexico", nameAr: "المكسيك", group: "A", iso: "mx" },
  { code: "RSA", nameEn: "South Africa", nameAr: "جنوب أفريقيا", group: "A", iso: "za" },
  { code: "KOR", nameEn: "South Korea", nameAr: "كوريا الجنوبية", group: "A", iso: "kr" },
  { code: "CZE", nameEn: "Czech Republic", nameAr: "التشيك", group: "A", iso: "cz" },
  // Group B
  { code: "CAN", nameEn: "Canada", nameAr: "كندا", group: "B", iso: "ca" },
  { code: "BIH", nameEn: "Bosnia & Herzegovina", nameAr: "البوسنة", group: "B", iso: "ba" },
  { code: "QAT", nameEn: "Qatar", nameAr: "قطر", group: "B", iso: "qa" },
  { code: "SUI", nameEn: "Switzerland", nameAr: "سويسرا", group: "B", iso: "ch" },
  // Group C
  { code: "BRA", nameEn: "Brazil", nameAr: "البرازيل", group: "C", iso: "br" },
  { code: "MAR", nameEn: "Morocco", nameAr: "المغرب", group: "C", iso: "ma" },
  { code: "HAI", nameEn: "Haiti", nameAr: "هايتي", group: "C", iso: "ht" },
  { code: "SCO", nameEn: "Scotland", nameAr: "إسكتلندا", group: "C", iso: "gb-sct" },
  // Group D
  { code: "USA", nameEn: "United States", nameAr: "أمريكا", group: "D", iso: "us" },
  { code: "PAR", nameEn: "Paraguay", nameAr: "باراغواي", group: "D", iso: "py" },
  { code: "AUS", nameEn: "Australia", nameAr: "أستراليا", group: "D", iso: "au" },
  { code: "TUR", nameEn: "Turkey", nameAr: "تركيا", group: "D", iso: "tr" },
  // Group E
  { code: "GER", nameEn: "Germany", nameAr: "ألمانيا", group: "E", iso: "de" },
  { code: "CUW", nameEn: "Curaçao", nameAr: "كوراساو", group: "E", iso: "cw" },
  { code: "CIV", nameEn: "Ivory Coast", nameAr: "ساحل العاج", group: "E", iso: "ci" },
  { code: "ECU", nameEn: "Ecuador", nameAr: "الإكوادور", group: "E", iso: "ec" },
  // Group F
  { code: "NED", nameEn: "Netherlands", nameAr: "هولندا", group: "F", iso: "nl" },
  { code: "JPN", nameEn: "Japan", nameAr: "اليابان", group: "F", iso: "jp" },
  { code: "SWE", nameEn: "Sweden", nameAr: "السويد", group: "F", iso: "se" },
  { code: "TUN", nameEn: "Tunisia", nameAr: "تونس", group: "F", iso: "tn" },
  // Group G
  { code: "BEL", nameEn: "Belgium", nameAr: "بلجيكا", group: "G", iso: "be" },
  { code: "EGY", nameEn: "Egypt", nameAr: "مصر", group: "G", iso: "eg" },
  { code: "IRN", nameEn: "Iran", nameAr: "إيران", group: "G", iso: "ir" },
  { code: "NZL", nameEn: "New Zealand", nameAr: "نيوزيلندا", group: "G", iso: "nz" },
  // Group H
  { code: "ESP", nameEn: "Spain", nameAr: "إسبانيا", group: "H", iso: "es" },
  { code: "CPV", nameEn: "Cape Verde", nameAr: "الرأس الأخضر", group: "H", iso: "cv" },
  { code: "KSA", nameEn: "Saudi Arabia", nameAr: "السعودية", group: "H", iso: "sa" },
  { code: "URU", nameEn: "Uruguay", nameAr: "أوروغواي", group: "H", iso: "uy" },
  // Group I
  { code: "FRA", nameEn: "France", nameAr: "فرنسا", group: "I", iso: "fr" },
  { code: "SEN", nameEn: "Senegal", nameAr: "السنغال", group: "I", iso: "sn" },
  { code: "IRQ", nameEn: "Iraq", nameAr: "العراق", group: "I", iso: "iq" },
  { code: "NOR", nameEn: "Norway", nameAr: "النرويج", group: "I", iso: "no" },
  // Group J
  { code: "ARG", nameEn: "Argentina", nameAr: "الأرجنتين", group: "J", iso: "ar" },
  { code: "ALG", nameEn: "Algeria", nameAr: "الجزائر", group: "J", iso: "dz" },
  { code: "AUT", nameEn: "Austria", nameAr: "النمسا", group: "J", iso: "at" },
  { code: "JOR", nameEn: "Jordan", nameAr: "الأردن", group: "J", iso: "jo" },
  // Group K
  { code: "POR", nameEn: "Portugal", nameAr: "البرتغال", group: "K", iso: "pt" },
  { code: "COD", nameEn: "DR Congo", nameAr: "الكونغو", group: "K", iso: "cd" },
  { code: "UZB", nameEn: "Uzbekistan", nameAr: "أوزبكستان", group: "K", iso: "uz" },
  { code: "COL", nameEn: "Colombia", nameAr: "كولومبيا", group: "K", iso: "co" },
  // Group L
  { code: "ENG", nameEn: "England", nameAr: "إنجلترا", group: "L", iso: "gb-eng" },
  { code: "CRO", nameEn: "Croatia", nameAr: "كرواتيا", group: "L", iso: "hr" },
  { code: "GHA", nameEn: "Ghana", nameAr: "غانا", group: "L", iso: "gh" },
  { code: "PAN", nameEn: "Panama", nameAr: "بنما", group: "L", iso: "pa" },
];

export function flagUrlForIso(iso: string): string {
  return `/flags/${iso}.svg`;
}
