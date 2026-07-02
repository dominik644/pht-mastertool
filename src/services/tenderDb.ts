import { fetchTimeoutSignal } from '../../lib/abortTimeout.js';
import { BULK_FETCH_PAGE_SIZE } from '../lib/performanceConstants';
import type { GlobalSearchResult } from '../lib/globalTenderSearch';

const DB_API = '/api/tenders-db';
const DB_FETCH_TIMEOUT_MS = 60_000;
const DB_BULK_TIMEOUT_MS = 120_000;
const MAX_BULK_PAGES = 20;
const BULK_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

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
  /** Server scans full DB and returns all PHT-relevant tenders (cached 5 min). */
  all?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Lädt Tender aus Supabase (via /api/tenders-db) – paginiert.
 */
export async function fetchTendersFromDb(options: DbFetchOptions = {}): Promise<DbFetchResult> {
  try {
    const params = new URLSearchParams();
    if (options.since) params.set('since', options.since);
    if (options.all) params.set('all', '1');
    if (options.page != null && options.page > 0) params.set('page', String(options.page));
    if (options.limit != null && options.limit > 0) params.set('limit', String(options.limit));
    if (options.cursor != null && options.cursor >= 0) params.set('cursor', String(options.cursor));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const timeoutMs = options.all ? DB_BULK_TIMEOUT_MS : DB_FETCH_TIMEOUT_MS;
    const res = await fetch(`${DB_API}${qs}`, {
      headers: { Accept: 'application/json' },
      signal: fetchTimeoutSignal(timeoutMs),
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
    if (!options.all && data.tenders.length === 0 && (data.hasMore ?? false)) {
      return { kind: 'error', message: 'Leere Seite trotz hasMore – bitte erneut laden' };
    }
    if (data.tenders.length === 0) return { kind: 'empty' };
    return { kind: 'ok', data: data as GlobalSearchResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Netzwerkfehler beim Laden';
    return { kind: 'error', message: msg };
  }
}

export interface BulkFetchProgress {
  loaded: number;
  estimated: number | null;
}

/**
 * Lädt alle PHT-relevanten Tender – zuerst ein Server-Vollscan (all=1), sonst
 * sequentielle 300er-Chunks mit Retry bis hasMore false.
 */
export async function fetchAllTendersFromDb(options?: {
  since?: string;
  onProgress?: (progress: BulkFetchProgress) => void;
}): Promise<DbFetchResult> {
  const onProgress = options?.onProgress;

  const allResult = await fetchTendersFromDb({ since: options?.since, all: true });
  if (allResult.kind === 'ok') {
    const estimated = allResult.data.relevantTotal ?? allResult.data.total ?? allResult.data.tenders.length;
    onProgress?.({ loaded: allResult.data.tenders.length, estimated });
    return allResult;
  }
  if (allResult.kind === 'skipped') return allResult;

  const merged: GlobalSearchResult['tenders'] = [];
  const seen = new Set<string>();
  let cursor = 0;
  let page = 1;
  let relevantTotal: number | null = null;
  let hasMore = true;
  let lastRegions: string[] = [];
  let lastSource = 'supabase-db';
  let providerCount: number | null = null;

  while (hasMore && page <= MAX_BULK_PAGES) {
    let chunk: DbFetchResult | null = null;
    for (let attempt = 0; attempt <= BULK_RETRY_DELAYS_MS.length; attempt++) {
      chunk = await fetchTendersFromDb({
        since: options?.since,
        limit: BULK_FETCH_PAGE_SIZE,
        cursor,
        page,
      });
      if (chunk.kind === 'ok' || chunk.kind === 'empty' || chunk.kind === 'skipped') break;
      if (attempt < BULK_RETRY_DELAYS_MS.length) {
        await delay(BULK_RETRY_DELAYS_MS[attempt]);
      }
    }

    if (!chunk || chunk.kind === 'skipped') return chunk ?? { kind: 'error', message: 'Supabase übersprungen' };
    if (chunk.kind === 'error') return chunk;
    if (chunk.kind === 'empty') break;

    if (relevantTotal == null) {
      relevantTotal = chunk.data.relevantTotal ?? chunk.data.total ?? null;
    }
    lastRegions = chunk.data.regions;
    lastSource = chunk.data.source;
    providerCount = chunk.data.providerCount ?? providerCount;

    for (const tender of chunk.data.tenders) {
      if (seen.has(tender.id)) continue;
      seen.add(tender.id);
      merged.push(tender);
    }

    onProgress?.({ loaded: merged.length, estimated: relevantTotal });

    hasMore = chunk.data.hasMore ?? false;
    if (!hasMore) break;

    const nextCursor = chunk.data.cursor;
    if (nextCursor == null || !Number.isFinite(nextCursor) || nextCursor <= cursor) {
      return { kind: 'error', message: 'Nachladen stagniert – Cursor bewegt sich nicht' };
    }
    cursor = nextCursor;
    page += 1;
  }

  if (merged.length === 0) return { kind: 'empty' };

  return {
    kind: 'ok',
    data: {
      tenders: merged,
      source: lastSource,
      regions: lastRegions,
      total: merged.length,
      hasMore: false,
      relevantTotal: relevantTotal ?? merged.length,
      providerCount: providerCount ?? undefined,
    },
  };
}
