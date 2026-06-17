import type { Tender } from '../types/tender';
import {
  STORAGE_MAX_BYTES,
  STORAGE_MAX_TENDERS,
} from '../lib/performanceConstants';
import { skipCacheOnStartup, isStartupStorageBlocked } from '../lib/startupFlags';

/** Bump suffix when match/scoring rules change – invalidates stale browser cache on next visit. */
const STORAGE_KEY = 'pht-mastertool-tenders-v3';
const LEGACY_STORAGE_KEYS = ['pht-mastertool-tenders', 'pht-mastertool-tenders-v2'];
const EXCLUDED_IDS_KEY = 'pht-mastertool-excluded-ids';

export function loadExcludedIds(): Set<string> {
  if (isStartupStorageBlocked()) return new Set();
  try {
    const stored = localStorage.getItem(EXCLUDED_IDS_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function saveExcludedIds(ids: Set<string>): void {
  if (isStartupStorageBlocked()) return;
  try {
    localStorage.setItem(EXCLUDED_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // quota exceeded – ignore
  }
}

/** One-shot purge of oversized legacy caches – safe to call before React mounts. */
export function clearLegacyTenderCache(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function trimTendersByScore(tenders: Tender[]): Tender[] {
  if (tenders.length <= STORAGE_MAX_TENDERS) return tenders;
  return [...tenders]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, STORAGE_MAX_TENDERS);
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

function persistTrimmedTenders(tenders: Tender[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenders));
    const excludedIds = tenders.filter((t) => t.excluded).map((t) => t.id);
    saveExcludedIds(new Set(excludedIds));
  } catch {
    // quota exceeded – ignore
  }
}

/**
 * Enforce cache size limits – keeps highest-scored tenders when over count or byte budget.
 */
export function guardTenderCacheSize(raw: string): Tender[] | null {
  try {
    const parsed = JSON.parse(raw) as Tender[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    let trimmed = trimTendersByScore(parsed);
    let serialized = JSON.stringify(trimmed);

    while (trimmed.length > 1 && byteLength(serialized) > STORAGE_MAX_BYTES) {
      trimmed = trimmed.slice(0, Math.floor(trimmed.length * 0.85));
      serialized = JSON.stringify(trimmed);
    }

    if (trimmed.length !== parsed.length || byteLength(raw) > STORAGE_MAX_BYTES) {
      persistTrimmedTenders(trimmed);
      if (import.meta.env.DEV) {
        console.warn(
          `[storage] Tender cache trimmed: ${parsed.length} → ${trimmed.length} (${Math.round(byteLength(serialized) / 1024)} KB)`,
        );
      }
    }

    return trimmed;
  } catch {
    return null;
  }
}

/** Fast path: parse localStorage only – no match/score reprocessing. */
export function loadTendersRaw(defaultTenders: Tender[]): Tender[] {
  return loadTenders(defaultTenders);
}

/**
 * Startup preview: parse cache once, return at most `maxCount` tenders without
 * full trim/sort pass – keeps first paint responsive with large caches.
 */
export function loadTendersRawPreview(maxCount: number, defaultTenders: Tender[] = []): Tender[] {
  if (skipCacheOnStartup() || isStartupStorageBlocked()) return defaultTenders;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultTenders;

    const parsed = JSON.parse(stored) as Tender[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTenders;

    const excludedIds = loadExcludedIds();
    const defaultMap = new Map(defaultTenders.map((t) => [t.id, t]));
    const slice = parsed.slice(0, Math.max(1, maxCount));

    return slice.map((item) => {
      const base = defaultMap.get(item.id);
      const merged = base ? { ...base, ...item } : item;
      return {
        ...merged,
        excluded: merged.excluded === true || excludedIds.has(merged.id),
      };
    });
  } catch {
    return defaultTenders;
  }
}

export function loadTenders(defaultTenders: Tender[]): Tender[] {
  if (skipCacheOnStartup() || isStartupStorageBlocked()) return defaultTenders;
  try {
    clearLegacyTenderCache();
    const stored = localStorage.getItem(STORAGE_KEY);
    const excludedIds = loadExcludedIds();
    if (!stored) return defaultTenders;

    const guarded = guardTenderCacheSize(stored);
    const parsed = guarded ?? (JSON.parse(stored) as Tender[]);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTenders;

    const defaultMap = new Map(defaultTenders.map((t) => [t.id, t]));
    return parsed.map((item) => {
      const base = defaultMap.get(item.id);
      const merged = base ? { ...base, ...item } : item;
      return {
        ...merged,
        excluded: merged.excluded === true || excludedIds.has(merged.id),
      };
    });
  } catch {
    return defaultTenders;
  }
}

export function saveTenders(tenders: Tender[]): void {
  if (isStartupStorageBlocked()) return;
  const trimmed = trimTendersByScore(tenders);
  let payload = JSON.stringify(trimmed);

  if (byteLength(payload) > STORAGE_MAX_BYTES) {
    let reduced = trimmed;
    while (reduced.length > 1 && byteLength(JSON.stringify(reduced)) > STORAGE_MAX_BYTES) {
      reduced = reduced.slice(0, Math.floor(reduced.length * 0.85));
    }
    payload = JSON.stringify(reduced);
    persistTrimmedTenders(reduced);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, payload);
    const excludedIds = trimmed.filter((t) => t.excluded).map((t) => t.id);
    saveExcludedIds(new Set(excludedIds));
  } catch {
    // quota exceeded – ignore
  }
}
