// Official WC2026 schedule — 104 fixtures.
// Source: official FIFA match schedule (kickoff times cross-referenced via the
// published day-by-day schedule, originally in BST = UTC+1). Group-stage teams
// are the real draw; knockout teams are TBD (decided by results). Venue names
// are FIFA's official (sponsor-free) names. City names are FIFA host cities.
//
// Encoded as BST (UTC+1) wall time; the generator converts to UTC (−1h) for
// storage and to KSA / Asia/Riyadh (+2h from BST) for display.

export interface RawFixture {
  n: number; // matchNumber
  h: string; // home team name (group) or "TBD" (knockout)
  a: string; // away team name (group) or "TBD" (knockout)
  date: string; // YYYY-MM-DD (BST calendar date)
  bst: string; // HH:MM 24h, British Summer Time (UTC+1)
  city: string; // source city label (mapped to FIFA city+stadium below)
}

// Source city label -> [FIFA host city, FIFA official stadium name]
export const VENUE: Record<string, [string, string]> = {
  "Mexico City": ["Mexico City", "Mexico City Stadium"],
  Zapopan: ["Guadalajara", "Estadio Guadalajara"],
  Toronto: ["Toronto", "Toronto Stadium"],
  "Los Angeles": ["Los Angeles", "Los Angeles Stadium"],
  "Santa Clara": ["San Francisco Bay Area", "San Francisco Bay Area Stadium"],
  "New Jersey": ["New York / New Jersey", "New York New Jersey Stadium"],
  Foxborough: ["Boston", "Boston Stadium"],
  Vancouver: ["Vancouver", "BC Place Vancouver"],
  Houston: ["Houston", "Houston Stadium"],
  Arlington: ["Dallas", "Dallas Stadium"],
  Philadelphia: ["Philadelphia", "Philadelphia Stadium"],
  Guadalupe: ["Monterrey", "Estadio Monterrey"],
  Atlanta: ["Atlanta", "Atlanta Stadium"],
  Seattle: ["Seattle", "Seattle Stadium"],
  Miami: ["Miami", "Miami Stadium"],
  "Kansas City": ["Kansas City", "Kansas City Stadium"],
};

// Team display name (as in the source) -> FIFA 3-letter code used in our DB.
export const NAME_TO_CODE: Record<string, string> = {
  Mexico: "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czech Republic": "CZE",
  Canada: "CAN", "Bosnia & Herzegovina": "BIH", Qatar: "QAT", Switzerland: "SUI",
  Brazil: "BRA", Morocco: "MAR", Haiti: "HAI", Scotland: "SCO",
  USA: "USA", Paraguay: "PAR", Australia: "AUS", Turkey: "TUR",
  Germany: "GER", Curacao: "CUW", "Ivory Coast": "CIV", Ecuador: "ECU",
  Netherlands: "NED", Japan: "JPN", Sweden: "SWE", Tunisia: "TUN",
  Belgium: "BEL", Egypt: "EGY", Iran: "IRN", "New Zealand": "NZL",
  Spain: "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", Uruguay: "URU",
  France: "FRA", Senegal: "SEN", Iraq: "IRQ", Norway: "NOR",
  Argentina: "ARG", Algeria: "ALG", Austria: "AUT", Jordan: "JOR",
  Portugal: "POR", "DR Congo": "COD", Uzbekistan: "UZB", Colombia: "COL",
  England: "ENG", Croatia: "CRO", Ghana: "GHA", Panama: "PAN",
};

const T = "TBD";

export const FIXTURES: RawFixture[] = [
  // ---- Group stage (1–72) ----
  { n: 1, h: "Mexico", a: "South Africa", date: "2026-06-11", bst: "20:00", city: "Mexico City" },
  { n: 2, h: "South Korea", a: "Czech Republic", date: "2026-06-12", bst: "03:00", city: "Zapopan" },
  { n: 3, h: "Canada", a: "Bosnia & Herzegovina", date: "2026-06-12", bst: "20:00", city: "Toronto" },
  { n: 4, h: "USA", a: "Paraguay", date: "2026-06-13", bst: "02:00", city: "Los Angeles" },
  { n: 5, h: "Qatar", a: "Switzerland", date: "2026-06-13", bst: "20:00", city: "Santa Clara" },
  { n: 6, h: "Brazil", a: "Morocco", date: "2026-06-13", bst: "23:00", city: "New Jersey" },
  { n: 7, h: "Haiti", a: "Scotland", date: "2026-06-14", bst: "02:00", city: "Foxborough" },
  { n: 8, h: "Australia", a: "Turkey", date: "2026-06-14", bst: "05:00", city: "Vancouver" },
  { n: 9, h: "Germany", a: "Curacao", date: "2026-06-14", bst: "18:00", city: "Houston" },
  { n: 10, h: "Netherlands", a: "Japan", date: "2026-06-14", bst: "21:00", city: "Arlington" },
  { n: 11, h: "Ivory Coast", a: "Ecuador", date: "2026-06-15", bst: "00:00", city: "Philadelphia" },
  { n: 12, h: "Sweden", a: "Tunisia", date: "2026-06-15", bst: "03:00", city: "Guadalupe" },
  { n: 13, h: "Spain", a: "Cape Verde", date: "2026-06-15", bst: "17:00", city: "Atlanta" },
  { n: 14, h: "Belgium", a: "Egypt", date: "2026-06-15", bst: "20:00", city: "Seattle" },
  { n: 15, h: "Saudi Arabia", a: "Uruguay", date: "2026-06-15", bst: "23:00", city: "Miami" },
  { n: 16, h: "Iran", a: "New Zealand", date: "2026-06-16", bst: "02:00", city: "Los Angeles" },
  { n: 17, h: "France", a: "Senegal", date: "2026-06-16", bst: "20:00", city: "New Jersey" },
  { n: 18, h: "Iraq", a: "Norway", date: "2026-06-16", bst: "23:00", city: "Foxborough" },
  { n: 19, h: "Argentina", a: "Algeria", date: "2026-06-17", bst: "02:00", city: "Kansas City" },
  { n: 20, h: "Austria", a: "Jordan", date: "2026-06-17", bst: "05:00", city: "Santa Clara" },
  { n: 21, h: "Portugal", a: "DR Congo", date: "2026-06-17", bst: "18:00", city: "Houston" },
  { n: 22, h: "England", a: "Croatia", date: "2026-06-17", bst: "21:00", city: "Arlington" },
  { n: 23, h: "Ghana", a: "Panama", date: "2026-06-18", bst: "00:00", city: "Toronto" },
  { n: 24, h: "Uzbekistan", a: "Colombia", date: "2026-06-18", bst: "03:00", city: "Mexico City" },
  { n: 25, h: "Czech Republic", a: "South Africa", date: "2026-06-18", bst: "17:00", city: "Atlanta" },
  { n: 26, h: "Switzerland", a: "Bosnia & Herzegovina", date: "2026-06-18", bst: "20:00", city: "Los Angeles" },
  { n: 27, h: "Canada", a: "Qatar", date: "2026-06-18", bst: "23:00", city: "Vancouver" },
  { n: 28, h: "Mexico", a: "South Korea", date: "2026-06-19", bst: "02:00", city: "Zapopan" },
  { n: 29, h: "USA", a: "Australia", date: "2026-06-19", bst: "20:00", city: "Seattle" },
  { n: 30, h: "Scotland", a: "Morocco", date: "2026-06-19", bst: "23:00", city: "Foxborough" },
  { n: 31, h: "Brazil", a: "Haiti", date: "2026-06-20", bst: "01:30", city: "Philadelphia" },
  { n: 32, h: "Turkey", a: "Paraguay", date: "2026-06-20", bst: "04:00", city: "Santa Clara" },
  { n: 33, h: "Netherlands", a: "Sweden", date: "2026-06-20", bst: "18:00", city: "Houston" },
  { n: 34, h: "Germany", a: "Ivory Coast", date: "2026-06-20", bst: "21:00", city: "Toronto" },
  { n: 35, h: "Ecuador", a: "Curacao", date: "2026-06-21", bst: "01:00", city: "Kansas City" },
  { n: 36, h: "Tunisia", a: "Japan", date: "2026-06-21", bst: "05:00", city: "Guadalupe" },
  { n: 37, h: "Spain", a: "Saudi Arabia", date: "2026-06-21", bst: "17:00", city: "Atlanta" },
  { n: 38, h: "Belgium", a: "Iran", date: "2026-06-21", bst: "20:00", city: "Los Angeles" },
  { n: 39, h: "Uruguay", a: "Cape Verde", date: "2026-06-21", bst: "23:00", city: "Miami" },
  { n: 40, h: "New Zealand", a: "Egypt", date: "2026-06-22", bst: "02:00", city: "Vancouver" },
  { n: 41, h: "Argentina", a: "Austria", date: "2026-06-22", bst: "18:00", city: "Arlington" },
  { n: 42, h: "France", a: "Iraq", date: "2026-06-22", bst: "22:00", city: "Philadelphia" },
  { n: 43, h: "Norway", a: "Senegal", date: "2026-06-23", bst: "01:00", city: "Toronto" },
  { n: 44, h: "Jordan", a: "Algeria", date: "2026-06-23", bst: "04:00", city: "Santa Clara" },
  { n: 45, h: "Portugal", a: "Uzbekistan", date: "2026-06-23", bst: "18:00", city: "Houston" },
  { n: 46, h: "England", a: "Ghana", date: "2026-06-23", bst: "21:00", city: "Foxborough" },
  { n: 47, h: "Panama", a: "Croatia", date: "2026-06-24", bst: "00:00", city: "Foxborough" },
  { n: 48, h: "Colombia", a: "DR Congo", date: "2026-06-24", bst: "03:00", city: "Zapopan" },
  { n: 49, h: "Switzerland", a: "Canada", date: "2026-06-24", bst: "20:00", city: "Vancouver" },
  { n: 50, h: "Bosnia & Herzegovina", a: "Qatar", date: "2026-06-24", bst: "20:00", city: "Seattle" },
  { n: 51, h: "Morocco", a: "Haiti", date: "2026-06-24", bst: "23:00", city: "Atlanta" },
  { n: 52, h: "Scotland", a: "Brazil", date: "2026-06-24", bst: "23:00", city: "Miami" },
  { n: 53, h: "South Africa", a: "South Korea", date: "2026-06-25", bst: "02:00", city: "Guadalupe" },
  { n: 54, h: "Czech Republic", a: "Mexico", date: "2026-06-25", bst: "02:00", city: "Mexico City" },
  { n: 55, h: "Curacao", a: "Ivory Coast", date: "2026-06-25", bst: "21:00", city: "Philadelphia" },
  { n: 56, h: "Ecuador", a: "Germany", date: "2026-06-25", bst: "21:00", city: "New Jersey" },
  { n: 57, h: "Tunisia", a: "Netherlands", date: "2026-06-26", bst: "00:00", city: "Kansas City" },
  { n: 58, h: "Japan", a: "Sweden", date: "2026-06-26", bst: "00:00", city: "Arlington" },
  { n: 59, h: "Turkey", a: "USA", date: "2026-06-26", bst: "03:00", city: "Los Angeles" },
  { n: 60, h: "Paraguay", a: "Australia", date: "2026-06-26", bst: "03:00", city: "Santa Clara" },
  { n: 61, h: "Norway", a: "France", date: "2026-06-26", bst: "20:00", city: "Foxborough" },
  { n: 62, h: "Senegal", a: "Iraq", date: "2026-06-26", bst: "20:00", city: "Toronto" },
  { n: 63, h: "Cape Verde", a: "Saudi Arabia", date: "2026-06-27", bst: "01:00", city: "Houston" },
  { n: 64, h: "Uruguay", a: "Spain", date: "2026-06-27", bst: "01:00", city: "Zapopan" },
  { n: 65, h: "New Zealand", a: "Belgium", date: "2026-06-27", bst: "04:00", city: "Vancouver" },
  { n: 66, h: "Egypt", a: "Iran", date: "2026-06-27", bst: "04:00", city: "Seattle" },
  { n: 67, h: "Panama", a: "England", date: "2026-06-27", bst: "22:00", city: "New Jersey" },
  { n: 68, h: "Croatia", a: "Ghana", date: "2026-06-27", bst: "22:00", city: "Philadelphia" },
  { n: 69, h: "Colombia", a: "Portugal", date: "2026-06-28", bst: "00:30", city: "Miami" },
  { n: 70, h: "DR Congo", a: "Uzbekistan", date: "2026-06-28", bst: "00:30", city: "Atlanta" },
  { n: 71, h: "Algeria", a: "Austria", date: "2026-06-28", bst: "03:00", city: "Kansas City" },
  { n: 72, h: "Jordan", a: "Argentina", date: "2026-06-28", bst: "03:00", city: "Arlington" },
  // ---- Round of 32 (73–88) ----
  { n: 73, h: T, a: T, date: "2026-06-28", bst: "20:00", city: "Los Angeles" },
  { n: 74, h: T, a: T, date: "2026-06-29", bst: "18:00", city: "Houston" },
  { n: 75, h: T, a: T, date: "2026-06-29", bst: "21:30", city: "Foxborough" },
  { n: 76, h: T, a: T, date: "2026-06-30", bst: "02:00", city: "Guadalupe" },
  { n: 77, h: T, a: T, date: "2026-06-30", bst: "18:00", city: "Arlington" },
  { n: 78, h: T, a: T, date: "2026-06-30", bst: "22:00", city: "New Jersey" },
  { n: 79, h: T, a: T, date: "2026-07-01", bst: "02:00", city: "Mexico City" },
  { n: 80, h: T, a: T, date: "2026-07-01", bst: "17:00", city: "Atlanta" },
  { n: 81, h: T, a: T, date: "2026-07-01", bst: "21:00", city: "Seattle" },
  { n: 82, h: T, a: T, date: "2026-07-02", bst: "01:00", city: "Santa Clara" },
  { n: 83, h: T, a: T, date: "2026-07-02", bst: "20:00", city: "Los Angeles" },
  { n: 84, h: T, a: T, date: "2026-07-03", bst: "00:00", city: "Toronto" },
  { n: 85, h: T, a: T, date: "2026-07-03", bst: "04:00", city: "Vancouver" },
  { n: 86, h: T, a: T, date: "2026-07-03", bst: "19:00", city: "Arlington" },
  { n: 87, h: T, a: T, date: "2026-07-03", bst: "23:00", city: "Miami" },
  { n: 88, h: T, a: T, date: "2026-07-04", bst: "02:30", city: "Kansas City" },
  // ---- Round of 16 (89–96) ----
  { n: 89, h: T, a: T, date: "2026-07-04", bst: "18:00", city: "Houston" },
  { n: 90, h: T, a: T, date: "2026-07-04", bst: "22:00", city: "Philadelphia" },
  { n: 91, h: T, a: T, date: "2026-07-05", bst: "21:00", city: "New Jersey" },
  { n: 92, h: T, a: T, date: "2026-07-06", bst: "01:00", city: "Mexico City" },
  { n: 93, h: T, a: T, date: "2026-07-06", bst: "20:00", city: "Arlington" },
  { n: 94, h: T, a: T, date: "2026-07-07", bst: "01:00", city: "Seattle" },
  { n: 95, h: T, a: T, date: "2026-07-07", bst: "17:00", city: "Atlanta" },
  { n: 96, h: T, a: T, date: "2026-07-07", bst: "21:00", city: "Vancouver" },
  // ---- Quarter-finals (97–100) ----
  { n: 97, h: T, a: T, date: "2026-07-09", bst: "21:00", city: "Foxborough" },
  { n: 98, h: T, a: T, date: "2026-07-10", bst: "20:00", city: "Los Angeles" },
  { n: 99, h: T, a: T, date: "2026-07-11", bst: "22:00", city: "Miami" },
  { n: 100, h: T, a: T, date: "2026-07-12", bst: "02:00", city: "Kansas City" },
  // ---- Semi-finals (101–102) ----
  { n: 101, h: T, a: T, date: "2026-07-14", bst: "20:00", city: "Arlington" },
  { n: 102, h: T, a: T, date: "2026-07-15", bst: "20:00", city: "Atlanta" },
  // ---- Third place (103) & Final (104) ----
  { n: 103, h: T, a: T, date: "2026-07-18", bst: "22:00", city: "Miami" },
  { n: 104, h: T, a: T, date: "2026-07-19", bst: "20:00", city: "New Jersey" },
];

export function stageForMatch(n: number): string {
  if (n <= 72) return "GROUP";
  if (n <= 88) return "ROUND_OF_32";
  if (n <= 96) return "ROUND_OF_16";
  if (n <= 100) return "QUARTER_FINAL";
  if (n <= 102) return "SEMI_FINAL";
  if (n === 103) return "THIRD_PLACE";
  return "FINAL";
}
