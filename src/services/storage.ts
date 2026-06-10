import type { Tender } from '../types/tender';

const STORAGE_KEY = 'pht-mastertool-tenders';

export function loadTenders(defaultTenders: Tender[]): Tender[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultTenders;

    const parsed = JSON.parse(stored) as Tender[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTenders;

    const defaultMap = new Map(defaultTenders.map((t) => [t.id, t]));
    return parsed.map((stored) => {
      const base = defaultMap.get(stored.id);
      return base ? { ...base, ...stored } : stored;
    });
  } catch {
    return defaultTenders;
  }
}

export function saveTenders(tenders: Tender[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenders));
}
