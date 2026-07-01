/**
 * Supabase-Bulk-Upsert für Phase-B-Ingest (optional, nur wenn Env gesetzt)
 */
import { processTenderForRead } from './tenderReadPipeline.js';

/** Project root only — fetch paths add /rest/v1 themselves. */
function normalizeSupabaseUrl(raw) {
  if (!raw) return raw;
  return raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function getSupabaseReadConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function rowToTender(row) {
  const raw = row.raw_json && typeof row.raw_json === 'object' ? row.raw_json : {};
  return {
    ...raw,
    id: row.id || raw.id,
    title: row.title || raw.title,
    country: row.country || raw.country,
    submissionDeadline: raw.submissionDeadline || row.deadline || raw.deadline,
    sourceUrl: row.url || raw.sourceUrl,
    sourcePlatform: row.source || raw.sourcePlatform,
  };
}

function tenderToRow(t) {
  return {
    id: t.id,
    title: (t.title || '').slice(0, 500),
    country: t.country || null,
    deadline: t.submissionDeadline || t.deadline || null,
    url: t.sourceUrl || null,
    source: t.sourcePlatform || t.source || null,
    raw_json: t,
    ingested_at: new Date().toISOString(),
  };
}

/** Default page size for paginated API reads. */
export const DEFAULT_PAGE_SIZE = 100;

/** Max rows scanned per API request (safety cap). */
const MAX_DB_SCAN = 12_000;

/** Raw rows fetched per Supabase round-trip while filling a page. */
const DB_BATCH_SIZE = 250;

/**
 * Cursor-based paginated read – resumes at `cursor` (raw DB row offset) so page 2+
 * does not rescan from row 0 (was causing 60s+ hangs after the first 50).
 *
 * @param {{ since?: string, page?: number, limit?: number, cursor?: number }} [options]
 * @returns {Promise<{ ok: boolean, tenders?: object[], total?: number, estimatedDbTotal?: number, page?: number, cursor?: number, hasMore?: boolean, skipped?: boolean, error?: string }>}
 */
export async function fetchTendersFromSupabase(options = {}) {
  const cfg = getSupabaseReadConfig();
  if (!cfg) return { ok: false, skipped: true };

  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.min(Math.max(1, Math.floor(Number(options.limit) || DEFAULT_PAGE_SIZE)), 200);
  const since = options.since;
  const startCursor = Math.max(0, Math.floor(Number(options.cursor) || 0));
  const pageTenders = [];
  let dbOffset = startCursor;
  let dbExhausted = false;
  let dbTotal = null;
  const scanCap = startCursor + MAX_DB_SCAN;

  try {
    while (pageTenders.length < limit && !dbExhausted && dbOffset < scanCap) {
      const batchSize = DB_BATCH_SIZE;
      const params = new URLSearchParams({
        select: 'id,title,country,deadline,url,source,raw_json,ingested_at',
        order: 'ingested_at.desc',
        limit: String(batchSize),
        offset: String(dbOffset),
      });
      if (since) {
        params.set('ingested_at', `gte.${since}`);
      }

      const res = await fetch(`${cfg.url}/rest/v1/tenders?${params}`, {
        headers: supabaseHeaders(cfg.key, dbOffset === 0 ? { Prefer: 'count=exact' } : {}),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
      }

      if (dbOffset === 0) {
        const range = res.headers.get('content-range') || '';
        const match = range.match(/\/(\d+|\*)$/);
        if (match && match[1] !== '*') {
          dbTotal = Number(match[1]);
        }
      }

      const pageRows = await res.json();
      if (!pageRows?.length) {
        dbExhausted = true;
        break;
      }

      for (const row of pageRows) {
        const scored = processTenderForRead(rowToTender(row));
        if (scored) {
          pageTenders.push(scored);
          if (pageTenders.length >= limit) break;
        }
      }

      dbOffset += pageRows.length;
      if (pageRows.length < batchSize) dbExhausted = true;
    }

    const scanCapped = !dbExhausted && dbOffset >= scanCap;
    const tenders = pageTenders.slice(0, limit);
    // Cursor pagination: continue until the DB is exhausted. A partial page after
    // scanCapped still has more rows beyond MAX_DB_SCAN – must not stop early.
    const hasMore = !dbExhausted;
    const nextCursor = dbOffset;

    return {
      ok: true,
      tenders,
      total: dbExhausted ? tenders.length : undefined,
      estimatedDbTotal: dbTotal ?? undefined,
      scanCapped: scanCapped || undefined,
      page,
      cursor: nextCursor,
      hasMore,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Supabase-Lesen fehlgeschlagen' };
  }
}

/**
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export async function getIngestState(key) {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  const params = new URLSearchParams({
    select: 'value',
    key: `eq.${key}`,
    limit: '1',
  });

  const res = await fetch(`${cfg.url}/rest/v1/ingest_state?${params}`, {
    headers: supabaseHeaders(cfg.key),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.value ?? null;
}

/**
 * @param {string} key
 * @param {object} value
 */
export async function setIngestState(key, value) {
  const cfg = getSupabaseConfig();
  if (!cfg) return { ok: false, skipped: true };

  const row = {
    key,
    value,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${cfg.url}/rest/v1/ingest_state`, {
    method: 'POST',
    headers: supabaseHeaders(cfg.key, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text.slice(0, 200) };
  }
  return { ok: true };
}

/**
 * @param {object[]} tenders
 * @returns {Promise<{ ok: boolean, upserted?: number, error?: string }>}
 */
export async function upsertTendersToSupabase(tenders) {
  const cfg = getSupabaseConfig();
  if (!cfg) return { ok: false, skipped: true };

  if (!tenders.length) return { ok: true, upserted: 0 };

  const rows = tenders.map(tenderToRow);
  const batchSize = 100;
  let upserted = 0;

  try {
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const res = await fetch(`${cfg.url}/rest/v1/tenders`, {
        method: 'POST',
        headers: supabaseHeaders(cfg.key, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
      }
      upserted += batch.length;
    }
    return { ok: true, upserted };
  } catch (err) {
    return { ok: false, error: err.message || 'Supabase-Fehler' };
  }
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseConfig());
}

export function hasSupabaseReadConfig() {
  return Boolean(getSupabaseReadConfig());
}
