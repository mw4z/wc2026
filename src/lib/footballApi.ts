// Thin client for API-Football / API-Sports (https://v3.football.api-sports.io).
// Server-only. Keys come from env and are NEVER exposed to the client.
// All failures are caught by callers; this module throws typed errors but never
// crashes the app on its own.

const PROVIDER = process.env.FOOTBALL_API_PROVIDER || "api-football";
const KEY = process.env.FOOTBALL_API_KEY || "";
const BASE = (process.env.FOOTBALL_API_BASE_URL || "https://v3.football.api-sports.io").replace(/\/$/, "");
const LEAGUE_ID = process.env.FOOTBALL_API_WORLD_CUP_LEAGUE_ID || "1";
const SEASON = process.env.FOOTBALL_API_WORLD_CUP_SEASON || "2026";

/** True only when a provider key is configured — otherwise sync is a no-op. */
export const footballApiConfigured = Boolean(KEY);
export const footballProvider = PROVIDER;
export const worldCupLeagueId = LEAGUE_ID;
export const worldCupSeason = SEASON;

// ---- Raw provider types (only the fields we use) ----
export interface RawFixture {
  fixture: {
    id: number;
    date: string; // ISO UTC
    status: { short: string; long: string };
    venue?: { name?: string | null; city?: string | null } | null;
  };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export class FootballApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  errors: unknown;
  results: number;
  response: T;
}

let remaining: number | null = null;
/** Provider requests remaining today (from the last response), or null if unknown. */
export function rateLimitRemaining(): number | null {
  return remaining;
}

async function request<T>(path: string): Promise<T> {
  if (!footballApiConfigured) throw new FootballApiError("Football API key not configured", 503);
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": KEY },
    // Never cache provider responses; always read fresh status.
    cache: "no-store",
  });
  // Track quota so callers can back off (free plans are ~100 req/day).
  const rem = res.headers.get("x-ratelimit-requests-remaining");
  if (rem != null) remaining = Number(rem);

  if (!res.ok) {
    throw new FootballApiError(`Provider HTTP ${res.status}`, res.status);
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  // The API returns 200 with an `errors` object/array on logical errors.
  if (json.errors && ((Array.isArray(json.errors) && json.errors.length) || (!Array.isArray(json.errors) && Object.keys(json.errors).length))) {
    throw new FootballApiError(`Provider error: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}

/** Fetch all fixtures for the configured World Cup league + season (for mapping). */
export async function fetchLeagueFixtures(): Promise<RawFixture[]> {
  return request<RawFixture[]>(`/fixtures?league=${encodeURIComponent(LEAGUE_ID)}&season=${encodeURIComponent(SEASON)}`);
}

/**
 * Fetch fixtures by provider ids. Batches into groups of ≤20 (provider limit for
 * the `ids` param) to minimize request count and respect quota.
 */
export async function fetchFixturesByIds(ids: string[]): Promise<Map<string, RawFixture>> {
  const out = new Map<string, RawFixture>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20);
    const resp = await request<RawFixture[]>(`/fixtures?ids=${batch.join("-")}`);
    for (const f of resp) out.set(String(f.fixture.id), f);
  }
  return out;
}
