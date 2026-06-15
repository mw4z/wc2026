import { prisma } from "./prisma";
import { arabicPlayerName } from "./playerNames";

// Auto Arabic player names. Resolution order:
//   1. curated map (playerNames.ts) — instant, highest confidence
//   2. cache (Setting rows keyed "pn:<norm>"; "" = known-no-Arabic, negative cache)
//   3. Wikidata (free, no key) — only on the write path (cron/live refresh)
// Wikidata gives real human-curated Arabic labels (not phonetic transliteration),
// and we require the match to look like a footballer to avoid wrong people.
//
// The display path uses CACHE ONLY (never blocks on the network); the cron/refresh
// path resolves + warms the cache, so a new scorer shows in Arabic within ~a minute.

const mem = new Map<string, string | null>(); // norm -> arabic | null (known-negative)

function norm(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}
const cacheKey = (n: string) => `pn:${n}`;

/**
 * Cache-only lookup (map → memory → Setting). Returns:
 *   string    known Arabic name
 *   null      known to have no Arabic name (don't bother)
 *   undefined not resolved yet (caller may trigger a network resolve)
 */
export async function lookupArabic(latin: string): Promise<string | null | undefined> {
  const n = norm(latin);
  if (mem.has(n)) return mem.get(n);
  const mapped = arabicPlayerName(latin);
  if (mapped) {
    mem.set(n, mapped);
    return mapped;
  }
  try {
    const row = await prisma.setting.findUnique({ where: { key: cacheKey(n) } });
    if (row) {
      const v = row.value || null;
      mem.set(n, v);
      return v;
    }
  } catch {
    /* Setting unavailable — treat as unknown */
  }
  return undefined;
}

/** Resolve + cache (may hit Wikidata). Use on the cron / live-refresh path only. */
export async function resolveArabic(latin: string): Promise<string | null> {
  const cached = await lookupArabic(latin);
  if (cached !== undefined) return cached;

  const ar = await fromWikidata(latin).catch(() => null);
  const n = norm(latin);
  mem.set(n, ar);
  try {
    await prisma.setting.upsert({
      where: { key: cacheKey(n) },
      create: { key: cacheKey(n), value: ar ?? "" },
      update: { value: ar ?? "" },
    });
  } catch {
    /* best-effort cache write */
  }
  return ar;
}

interface WdSearch {
  search?: { id: string; description?: string }[];
}
interface WdEntities {
  entities?: Record<string, { labels?: { ar?: { value?: string } } }>;
}

async function fromWikidata(latin: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  const headers = { "User-Agent": "wc2026-gamepredict/1.0 (goal scorer names)" };
  try {
    const searchUrl =
      "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&type=item&limit=8" +
      `&language=en&uselang=en&search=${encodeURIComponent(latin)}`;
    const sres = await fetch(searchUrl, { signal: ctrl.signal, headers, cache: "no-store" });
    if (!sres.ok) return null;
    const sjson = (await sres.json()) as WdSearch;
    // Require a football-looking match so we don't grab a random person of the same name.
    const hit = (sjson.search ?? []).find((r) => /foot(ball)?|soccer/i.test(r.description || ""));
    if (!hit) return null;

    const labelUrl =
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=labels&languages=ar" +
      `&ids=${encodeURIComponent(hit.id)}`;
    const lres = await fetch(labelUrl, { signal: ctrl.signal, headers, cache: "no-store" });
    if (!lres.ok) return null;
    const ljson = (await lres.json()) as WdEntities;
    const ar = ljson.entities?.[hit.id]?.labels?.ar?.value;
    return ar && ar.trim() ? ar.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
