/**
 * Supabase-Bulk-Upsert für Phase-B-Ingest (optional, nur wenn Env gesetzt)
 */
import { matchesPHT } from './tenders/utils.js';

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

/** Max tenders returned per API read (paginated past PostgREST default 1000-row cap). */
export const SUPABASE_READ_LIMIT = 5000;
const SUPABASE_PAGE_SIZE = 1000;

/**
 * @param {{ since?: string, limit?: number }} [options]
 * @returns {Promise<{ ok: boolean, tenders?: object[], skipped?: boolean, error?: string }>}
 */
export async function fetchTendersFromSupabase(options = {}) {
  const cfg = getSupabaseReadConfig();
  if (!cfg) return { ok: false, skipped: true };

  const totalLimit = Math.min(options.limit ?? SUPABASE_READ_LIMIT, SUPABASE_READ_LIMIT);
  const rows = [];

  try {
    while (rows.length < totalLimit) {
      const pageSize = Math.min(SUPABASE_PAGE_SIZE, totalLimit - rows.length);
      const params = new URLSearchParams({
        select: 'id,title,country,deadline,url,source,raw_json,ingested_at',
        order: 'ingested_at.desc',
        limit: String(pageSize),
        offset: String(rows.length),
      });
      if (options.since) {
        params.set('ingested_at', `gte.${options.since}`);
      }

      const res = await fetch(`${cfg.url}/rest/v1/tenders?${params}`, {
        headers: supabaseHeaders(cfg.key),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
      }
      const page = await res.json();
      if (!page?.length) break;
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return { ok: true, tenders: rows.map(rowToTender).filter(matchesPHT) };
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
    signal: AbortSignal.timeout(15000),
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
    signal: AbortSignal.timeout(15000),
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
        signal: AbortSignal.timeout(60000),
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
