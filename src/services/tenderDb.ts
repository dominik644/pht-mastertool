import type { GlobalSearchResult } from '../lib/globalTenderSearch';

const DB_API = '/api/tenders-db';

/**
 * Lädt Tender aus Supabase (via /api/tenders-db). Gibt null zurück wenn nicht konfiguriert.
 */
export async function fetchTendersFromDb(since?: string): Promise<GlobalSearchResult | null> {
  try {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    const res = await fetch(`${DB_API}${qs}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25000),
    });
    if (res.status === 503) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.tenders) || data.tenders.length === 0) return null;
    return data as GlobalSearchResult;
  } catch {
    return null;
  }
}
