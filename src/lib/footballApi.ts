// Football results provider client. Server-only; keys never reach the client.
// Two providers are supported (selected by FOOTBALL_API_PROVIDER):
//   • "football-data"  → football-data.org  (free tier covers the World Cup)
//   • "api-football"   → API-Football / API-Sports (paid for the 2026 season)
// Each provider's response is normalized to ParsedFixture so the rest of the
// pipeline is provider-agnostic. All failures throw FootballApiError (callers
// catch them — provider problems never break the app).

import {
  parseApiFootball,
  parseFootballData,
  type ApiFootballRaw,
  type FootballDataRaw,
  type ParsedFixture,
} from "./resultSyncCore";

const PROVIDER = (process.env.FOOTBALL_API_PROVIDER || "football-data").toLowerCase();
const KEY = process.env.FOOTBALL_API_KEY || "";
const SEASON = process.env.FOOTBALL_API_WORLD_CUP_SEASON || "2026";
const LEAGUE = process.env.FOOTBALL_API_WORLD_CUP_LEAGUE_ID || (PROVIDER === "api-football" ? "1" : "WC");
const BASE = (process.env.FOOTBALL_API_BASE_URL || defaultBase(PROVIDER)).replace(/\/$/, "");

function defaultBase(p: string): string {
  return p === "api-football" ? "https://v3.football.api-sports.io" : "https://api.football-data.org/v4";
}

export const footballApiConfigured = Boolean(KEY);
export const footballProvider = PROVIDER;

export class FootballApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

let remaining: number | null = null;
/** Provider requests remaining (per the last response), or null if unknown. */
export function rateLimitRemaining(): number | null {
  return remaining;
}

/**
 * Fetch ALL World Cup fixtures for the configured season in a single request,
 * normalized to ParsedFixture[]. Used by both the sync and the mapping script.
 * One request per call keeps us well within free-tier quotas.
 */
export async function fetchAllFixtures(): Promise<ParsedFixture[]> {
  if (!footballApiConfigured) throw new FootballApiError("Football API key not configured", 503);

  if (PROVIDER === "api-football") {
    const res = await fetch(`${BASE}/fixtures?league=${encodeURIComponent(LEAGUE)}&season=${encodeURIComponent(SEASON)}`, {
      headers: { "x-apisports-key": KEY },
      cache: "no-store",
    });
    const rem = res.headers.get("x-ratelimit-requests-remaining");
    if (rem != null) remaining = Number(rem);
    if (!res.ok) throw new FootballApiError(`Provider HTTP ${res.status}`, res.status);
    const json = (await res.json()) as { errors?: unknown; response?: ApiFootballRaw[] };
    if (json.errors && ((Array.isArray(json.errors) && json.errors.length) || (!Array.isArray(json.errors) && Object.keys(json.errors as object).length))) {
      throw new FootballApiError(`Provider error: ${JSON.stringify(json.errors)}`);
    }
    return (json.response ?? []).map(parseApiFootball);
  }

  // football-data.org
  const res = await fetch(`${BASE}/competitions/${encodeURIComponent(LEAGUE)}/matches?season=${encodeURIComponent(SEASON)}`, {
    headers: { "X-Auth-Token": KEY },
    cache: "no-store",
  });
  const rem = res.headers.get("X-Requests-Available-Minute");
  if (rem != null) remaining = Number(rem);
  if (!res.ok) throw new FootballApiError(`Provider HTTP ${res.status}`, res.status);
  const json = (await res.json()) as { matches?: FootballDataRaw[] };
  return (json.matches ?? []).map(parseFootballData);
}
