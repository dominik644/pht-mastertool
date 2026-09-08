import {
  insertSupabaseSnapaddyCard,
} from './supabaseSnapaddyInbox.js';

function normalizeSupabaseUrl(raw) {
  if (!raw) return null;
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

function getConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function isTableMissing(status, text) {
  if (status === 404) return true;
  return /plaud_inbox|PGRST205|relation.*does not exist|Could not find the table/i.test(String(text ?? ''));
}

function asPlaudNote(payload, status, requireKind = false) {
  if (!payload?.id) return null;
  if (requireKind && payload.kind !== 'plaud') return null;
  if (payload.kind && payload.kind !== 'plaud') return null;
  const { kind: _kind, ...rest } = payload;
  return {
    ...rest,
    status: status || rest.status || 'pending',
  };
}

async function listFromTable(table, { status, requireKind } = {}) {
  const cfg = getConfig();
  if (!cfg) return [];
  try {
    const params = new URLSearchParams({
      select: 'payload,status,received_at',
      order: 'received_at.desc',
    });
    if (status) params.set('status', `eq.${status}`);
    const res = await fetch(`${cfg.url}/rest/v1/${table}?${params}`, {
      headers: headers(cfg.key),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : [])
      .map((row) => asPlaudNote(row?.payload, row?.status, requireKind))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchFromTable(table, id, requireKind = false) {
  const cfg = getConfig();
  if (!cfg || !id) return null;
  try {
    const params = new URLSearchParams({
      select: 'payload,status',
      id: `eq.${id}`,
      limit: '1',
    });
    const res = await fetch(`${cfg.url}/rest/v1/${table}?${params}`, {
      headers: headers(cfg.key),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    return asPlaudNote(row?.payload, row?.status, requireKind);
  } catch {
    return null;
  }
}

async function patchTable(table, id, status, payload) {
  const cfg = getConfig();
  if (!cfg) return false;
  try {
    const params = new URLSearchParams({ id: `eq.${id}` });
    const res = await fetch(`${cfg.url}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: headers(cfg.key, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ status, payload }),
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function insertSupabasePlaudNote(note) {
  const cfg = getConfig();
  if (!cfg) return { ok: false, skipped: true };
  const body = {
    id: note.id,
    payload: { ...note, kind: 'plaud' },
    status: note.status || 'pending',
    received_at: note.receivedAt,
  };
  try {
    const res = await fetch(`${cfg.url}/rest/v1/plaud_inbox`, {
      method: 'POST',
      headers: headers(cfg.key, { Prefer: 'return=minimal,resolution=merge-duplicates' }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) return { ok: true, table: 'plaud_inbox' };
    const text = await res.text();
    if (!isTableMissing(res.status, text)) {
      return { ok: false, error: text.slice(0, 180) };
    }
  } catch (err) {
    return { ok: false, skipped: true, error: err.message };
  }

  const fallback = await insertSupabaseSnapaddyCard({ ...note, kind: 'plaud' });
  if (fallback.ok) return { ok: true, table: 'snapaddy_inbox' };
  return fallback;
}

export async function listSupabasePlaudNotes({ status } = {}) {
  const [own, fallback] = await Promise.all([
    listFromTable('plaud_inbox', { status }),
    listFromTable('snapaddy_inbox', { status, requireKind: true }),
  ]);
  const map = new Map();
  for (const note of [...own, ...fallback]) {
    if (note?.id) map.set(note.id, note);
  }
  return [...map.values()].sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')));
}

export async function fetchSupabasePlaudNote(id) {
  return (await fetchFromTable('plaud_inbox', id))
    || (await fetchFromTable('snapaddy_inbox', id, true));
}

export async function updateSupabasePlaudNoteStatus(id, status) {
  const existing = await fetchSupabasePlaudNote(id);
  const payload = existing
    ? { ...existing, kind: 'plaud', status }
    : { id, kind: 'plaud', status };
  const [own, fallback] = await Promise.all([
    patchTable('plaud_inbox', id, status, payload),
    patchTable('snapaddy_inbox', id, status, payload),
  ]);
  return own || fallback;
}
