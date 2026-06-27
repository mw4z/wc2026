import { prisma } from "./prisma";

// Auto player photos. ESPN's national-team feed rarely includes headshots (its
// club-player ids differ from national-team ids), so we resolve photos from
// Wikipedia's pageimages — which has a picture for essentially every notable
// player — and cache the result (Setting rows keyed "pp:<norm>"; "" = known-none).
//
// Resolution order per name:
//   1. memory cache
//   2. Setting cache (persisted)
//   3. Wikipedia pageimages (network) — only on the resolve path
//
// Photos are licensed images on Wikimedia Commons (hotlinked via upload.wikimedia.org).

const mem = new Map<string, string | null>();

function norm(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}
const cacheKey = (n: string) => `pp:${n}`;
const WIKI_UA = "wc2026-gamepredict/1.0 (player photos)";

function isFootballerDesc(desc: string | undefined): boolean {
  if (!desc) return false;
  if (/\b(club|team|stadium|arena|league|cup|tournament|competition|venue|ground|academy|federation|national team)\b/i.test(desc)) {
    return false;
  }
  return /foot(ball)?|soccer|player|midfielder|forward|defender|goalkeeper|winger|striker|footballer/i.test(desc);
}

interface WpImages {
  query?: {
    pages?: Record<
      string,
      { index?: number; description?: string; thumbnail?: { source?: string } }
    >;
  };
}

async function fromWikipedia(latin: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages%7Cdescription" +
      "&piprop=thumbnail&pithumbsize=200&generator=search&gsrlimit=3" +
      `&gsrsearch=${encodeURIComponent(latin + " footballer")}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": WIKI_UA }, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as WpImages;
    const pages = Object.values(json.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
    for (const p of pages) {
      if (p.thumbnail?.source && isFootballerDesc(p.description)) return p.thumbnail.source;
    }
    // Fallback: first hit with any thumbnail (search already biased by "footballer").
    for (const p of pages) if (p.thumbnail?.source) return p.thumbnail.source;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Cache-only lookup. string = url, null = known-none, undefined = not resolved yet. */
export async function lookupPhoto(latin: string): Promise<string | null | undefined> {
  const n = norm(latin);
  if (mem.has(n)) return mem.get(n);
  try {
    const row = await prisma.setting.findUnique({ where: { key: cacheKey(n) } });
    if (row) {
      const v = row.value || null;
      mem.set(n, v);
      return v;
    }
  } catch {
    /* Setting unavailable */
  }
  return undefined;
}

// Hit Wikipedia, then persist (mem + Setting). Used after the caches miss.
async function networkResolve(latin: string): Promise<string | null> {
  const url = await fromWikipedia(latin).catch(() => null);
  const n = norm(latin);
  mem.set(n, url);
  try {
    await prisma.setting.upsert({
      where: { key: cacheKey(n) },
      create: { key: cacheKey(n), value: url ?? "" },
      update: { value: url ?? "" },
    });
  } catch {
    /* best-effort */
  }
  return url;
}

/** Resolve + cache a single name (may hit Wikipedia). */
export async function resolvePhoto(latin: string): Promise<string | null> {
  const cached = await lookupPhoto(latin);
  if (cached !== undefined) return cached;
  return networkResolve(latin);
}

/**
 * Resolve photos for many players at once. Cache reads are batched into a single
 * DB query; only true misses hit Wikipedia (capped concurrency). Returns a map
 * keyed by the EXACT input name.
 */
export async function resolvePhotos(names: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const uniq = [...new Set(names.filter(Boolean))];
  const keyOf = new Map<string, string>(uniq.map((name) => [name, norm(name)]));

  // 1) memory cache
  const need: string[] = [];
  for (const name of uniq) {
    const n = keyOf.get(name)!;
    if (mem.has(n)) out.set(name, mem.get(n)!);
    else need.push(name);
  }

  // 2) one batched Setting read for the rest
  let todo = need;
  if (need.length) {
    const keys = need.map((name) => cacheKey(keyOf.get(name)!));
    let rows: { key: string; value: string }[] = [];
    try {
      rows = await prisma.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
    } catch {
      /* treat all as misses */
    }
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    todo = [];
    for (const name of need) {
      const k = cacheKey(keyOf.get(name)!);
      if (byKey.has(k)) {
        const v = byKey.get(k) || null;
        mem.set(keyOf.get(name)!, v);
        out.set(name, v);
      } else {
        todo.push(name);
      }
    }
  }

  // 3) network-resolve the true misses, capped concurrency (polite to Wikipedia)
  const CONC = 6;
  for (let i = 0; i < todo.length; i += CONC) {
    const batch = todo.slice(i, i + CONC);
    const results = await Promise.all(batch.map((name) => networkResolve(name).then((u) => [name, u] as const)));
    for (const [name, u] of results) out.set(name, u);
  }
  return out;
}
