import type { Locale } from "./i18n";

// GamePredict is a permanent football-predictions app; the World Cup is just the
// current active season. This is the ONLY place the current competition is named,
// so moving to the next tournament (Asian Cup, Euro, league, …) is a one-line
// change here — or an env override, no redeploy of copy needed.
export const ACTIVE_TOURNAMENT = {
  nameAr: process.env.NEXT_PUBLIC_ACTIVE_TOURNAMENT_AR || "كأس العالم 2026",
  nameEn: process.env.NEXT_PUBLIC_ACTIVE_TOURNAMENT_EN || "World Cup 2026",
};

export function tournamentName(locale: Locale): string {
  return locale === "en" ? ACTIVE_TOURNAMENT.nameEn : ACTIVE_TOURNAMENT.nameAr;
}
