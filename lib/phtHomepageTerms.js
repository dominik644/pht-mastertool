/**
 * Einmaliger Abruf der PHT-Homepage (pht.group) – Produktbegriffe extrahieren, cachen.
 * Kein Web-Crawling; nur die eigene Firmenseite für Match-Ergänzung.
 */
const DEFAULT_PHT_URL = 'https://pht.group';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Fallback aus Preisliste / bekannten PHT-Produktfamilien. */
const FALLBACK_TERMS = [
  'hygienestation', 'schaumstation', 'niederdruck', 'waschanlage', 'kistenwasch',
  'behälterwasch', 'palettenwasch', 'spind', 'garderobe', 'sohlenreiniger', 'sanicare',
  'industriewasch', 'reinigungsgerät', 'betriebshygiene', 'personenschleuse',
];

let cache = { terms: [...FALLBACK_TERMS], fetchedAt: 0, source: 'fallback' };

function resolveHomepageUrl() {
  if (typeof process !== 'undefined' && process.env?.PHT_HOMEPAGE_URL) {
    return process.env.PHT_HOMEPAGE_URL;
  }
  return DEFAULT_PHT_URL;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function extractTermsFromHtml(html) {
  const text = stripHtml(html);
  const found = new Set(FALLBACK_TERMS);
  const patterns = [
    /\b(hygienestation\w*|schaumstation\w*|niederdruck\w*|waschanlage\w*)\b/g,
    /\b(kisten\w*wasch\w*|behälter\w*wasch\w*|paletten\w*wasch\w*)\b/g,
    /\b(spind\w*|garderob\w*|sohlen\w*|sanicare\w*|industriewasch\w*)\b/g,
    /\b(reinigungs\w*|betriebshygiene\w*|personenschleus\w*)\b/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      if (m[0] && m[0].length >= 5) found.add(m[0].slice(0, 40));
    }
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    for (const w of titleMatch[1].toLowerCase().split(/[^a-zäöüß0-9]+/)) {
      if (w.length >= 6) found.add(w);
    }
  }
  return [...found].slice(0, 80);
}

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ terms: string[], source: string, fetchedAt: number }>}
 */
export async function getPhtHomepageTerms(options = {}) {
  const now = Date.now();
  if (!options.force && cache.fetchedAt && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const url = resolveHomepageUrl();
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/html', 'User-Agent': 'PHT-Mastertool/1.0 (product-term-sync)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const terms = extractTermsFromHtml(html);
    cache = { terms, fetchedAt: now, source: url };
    return cache;
  } catch {
    cache = { terms: [...FALLBACK_TERMS], fetchedAt: now, source: 'fallback' };
    return cache;
  }
}

export function getCachedPhtHomepageTerms() {
  return cache.terms;
}
