import type { Tender } from '../types/tender';

/** Bump suffix when match/scoring rules change – invalidates stale browser cache on next visit. */
const STORAGE_KEY = 'pht-mastertool-tenders-v3';
const LEGACY_STORAGE_KEYS = ['pht-mastertool-tenders', 'pht-mastertool-tenders-v2'];
const EXCLUDED_IDS_KEY = 'pht-mastertool-excluded-ids';

export function loadExcludedIds(): Set<string> {
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
  localStorage.setItem(EXCLUDED_IDS_KEY, JSON.stringify([...ids]));
}

function clearLegacyTenderCache(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function loadTenders(defaultTenders: Tender[]): Tender[] {
  try {
    clearLegacyTenderCache();
    const stored = localStorage.getItem(STORAGE_KEY);
    const excludedIds = loadExcludedIds();
    if (!stored) return defaultTenders;

    const parsed = JSON.parse(stored) as Tender[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTenders;

    const defaultMap = new Map(defaultTenders.map((t) => [t.id, t]));
    return parsed.map((stored) => {
      const base = defaultMap.get(stored.id);
      const merged = base ? { ...base, ...stored } : stored;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenders));
  const excludedIds = tenders.filter((t) => t.excluded).map((t) => t.id);
  saveExcludedIds(new Set(excludedIds));
}
