import { fetchTimeoutSignal } from '../../lib/abortTimeout.js';
import type { GlobalSearchResult } from '../lib/globalTenderSearch';

const DB_API = '/api/tenders-db';
const DB_FETCH_TIMEOUT_MS = 25_000;
export type DbFetchResult =
  | { kind: 'skipped' }
  | { kind: 'empty' }
  | { kind: 'ok'; data: GlobalSearchResult };

export interface DbFetchOptions {
  since?: string;
  /** Cap rows returned – use 50 on startup for fast first paint. */
  limit?: number;
}

/**
 * Lädt Tender aus Supabase (via /api/tenders-db).
 */
export async function fetchTendersFromDb(options: DbFetchOptions = {}): Promise<DbFetchResult> {
  try {
    const params = new URLSearchParams();
    if (options.since) params.set('since', options.since);
    if (options.limit != null && options.limit > 0) params.set('limit', String(options.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${DB_API}${qs}`, {
      headers: { Accept: 'application/json' },
      signal: fetchTimeoutSignal(DB_FETCH_TIMEOUT_MS),
    });
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      if (body?.skipped) return { kind: 'skipped' };
      return { kind: 'empty' };
    }
    if (!res.ok) return { kind: 'empty' };
    const data = await res.json();
    if (!Array.isArray(data.tenders) || data.tenders.length === 0) return { kind: 'empty' };
    return { kind: 'ok', data: data as GlobalSearchResult };
  } catch {
    return { kind: 'empty' };
  }
}
