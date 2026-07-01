import { fetchTimeoutSignal } from '../../lib/abortTimeout.js';
import type { GlobalSearchResult } from '../lib/globalTenderSearch';

const DB_API = '/api/tenders-db';
const DB_FETCH_TIMEOUT_MS = 60_000;

export type DbFetchResult =
  | { kind: 'skipped' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; data: GlobalSearchResult };

export interface DbFetchOptions {
  since?: string;
  /** Page number (1-based) – informational for the client. */
  page?: number;
  /** Rows per page – default 50. */
  limit?: number;
  /** Raw Supabase row offset to resume scanning (cursor pagination). */
  cursor?: number;
}

/**
 * Lädt Tender aus Supabase (via /api/tenders-db) – paginiert.
 */
export async function fetchTendersFromDb(options: DbFetchOptions = {}): Promise<DbFetchResult> {
  try {
    const params = new URLSearchParams();
    if (options.since) params.set('since', options.since);
    if (options.page != null && options.page > 0) params.set('page', String(options.page));
    if (options.limit != null && options.limit > 0) params.set('limit', String(options.limit));
    if (options.cursor != null && options.cursor >= 0) params.set('cursor', String(options.cursor));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${DB_API}${qs}`, {
      headers: { Accept: 'application/json' },
      signal: fetchTimeoutSignal(DB_FETCH_TIMEOUT_MS),
    });
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      if (body?.skipped) return { kind: 'skipped' };
      return { kind: 'error', message: body?.error ?? 'Supabase nicht verfügbar (503)' };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { kind: 'error', message: body?.error ?? `Datenbank-Fehler (${res.status})` };
    }
    const data = await res.json();
    if (!Array.isArray(data.tenders)) {
      return { kind: 'error', message: 'Ungültige API-Antwort' };
    }
    if (data.tenders.length === 0 && (data.hasMore ?? false)) {
      return { kind: 'error', message: 'Leere Seite trotz hasMore – bitte erneut laden' };
    }
    if (data.tenders.length === 0) return { kind: 'empty' };
    return { kind: 'ok', data: data as GlobalSearchResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Netzwerkfehler beim Laden';
    return { kind: 'error', message: msg };
  }
}
