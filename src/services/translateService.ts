const CACHE_KEY = 'pht-translate-cache-v1';
const CACHE_MAX = 400;
const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 150;

type CacheEntry = { text: string; at: number };
type Pending = { text: string; resolve: (value: string) => void };

const memoryCache = new Map<string, string>();
let storageCache: Record<string, CacheEntry> | null = null;
let pending: Pending[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;

const GERMAN_HINT =
  /\b(und|der|die|das|für|mit|von|auf|ist|sind|werden|Ausschreibung|Vergabe|Lieferung|Beschaffung|Auftrag|Dienstleistung)\b|[äöüÄÖÜß]/i;

function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 33) ^ text.charCodeAt(i);
  }
  return `t${(h >>> 0).toString(36)}`;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function looksGermanLocally(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return true;
  if (GERMAN_HINT.test(normalized)) return true;
  const words = normalized.split(/\s+/);
  const germanish = words.filter((w) => /[äöüÄÖÜß]/.test(w) || /(ung|keit|schaft|ieren|lich)$/i.test(w));
  return germanish.length / words.length >= 0.25;
}

function readStorage(): Record<string, CacheEntry> {
  if (storageCache) return storageCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      storageCache = {};
      return storageCache;
    }
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    storageCache = parsed && typeof parsed === 'object' ? parsed : {};
    return storageCache;
  } catch {
    storageCache = {};
    return storageCache;
  }
}

function writeStorage(entries: Record<string, CacheEntry>) {
  storageCache = entries;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // quota exceeded – ignore
  }
}

function getCached(text: string): string | null {
  const normalized = normalize(text);
  if (!normalized) return normalized;

  const mem = memoryCache.get(normalized);
  if (mem) return mem;

  const key = hashText(normalized);
  const stored = readStorage()[key];
  if (stored?.text) {
    memoryCache.set(normalized, stored.text);
    return stored.text;
  }
  return null;
}

function setCached(original: string, translated: string) {
  const normalized = normalize(original);
  if (!normalized) return;
  memoryCache.set(normalized, translated);

  const key = hashText(normalized);
  const entries = readStorage();
  entries[key] = { text: translated, at: Date.now() };

  const keys = Object.keys(entries);
  if (keys.length > CACHE_MAX) {
    keys
      .sort((a, b) => entries[a].at - entries[b].at)
      .slice(0, keys.length - CACHE_MAX)
      .forEach((k) => delete entries[k]);
  }
  writeStorage(entries);
}

async function flushQueue() {
  if (inflight) return inflight;

  inflight = (async () => {
    while (pending.length > 0) {
      const batch = pending.splice(0, BATCH_SIZE);
      const uniqueTexts = [...new Set(batch.map((b) => normalize(b.text)).filter(Boolean))];
      const uncached = uniqueTexts.filter((t) => !getCached(t) && !looksGermanLocally(t));

      let translatedMap = new Map<string, string>();
      if (uncached.length > 0) {
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: uncached }),
          });
          if (res.ok) {
            const data = (await res.json()) as { translations?: string[] };
            uncached.forEach((text, i) => {
              const translated = normalize(data.translations?.[i] ?? text);
              setCached(text, translated);
              translatedMap.set(text, translated);
            });
          }
        } catch {
          uncached.forEach((text) => translatedMap.set(text, text));
        }
      }

      batch.forEach(({ text, resolve }) => {
        const normalized = normalize(text);
        if (!normalized) {
          resolve('');
          return;
        }
        if (looksGermanLocally(normalized)) {
          setCached(normalized, normalized);
          resolve(normalized);
          return;
        }
        resolve(getCached(normalized) ?? translatedMap.get(normalized) ?? normalized);
      });

      if (pending.length > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  })().finally(() => {
    inflight = null;
    flushTimer = null;
  });

  return inflight;
}

function schedule(text: string): Promise<string> {
  const normalized = normalize(text);
  if (!normalized) return Promise.resolve('');
  const cached = getCached(normalized);
  if (cached) return Promise.resolve(cached);
  if (looksGermanLocally(normalized)) {
    setCached(normalized, normalized);
    return Promise.resolve(normalized);
  }

  return new Promise((resolve) => {
    pending.push({ text: normalized, resolve });
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flushQueue();
      }, BATCH_DELAY_MS);
    }
  });
}

export function translateText(text: string): Promise<string> {
  return schedule(text);
}

export function translateTexts(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map((t) => schedule(t)));
}
