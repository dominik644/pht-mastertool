/**
 * Supabase sync for sales feedback & customer visits (optional – env-gated).
 * Tables: sales_feedback, customer_visits (see supabase/schema.sql)
 */

function normalizeSupabaseUrl(raw) {
  if (!raw) return null;
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

function getSupabaseWriteConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function getSupabaseReadConfig() {
  return getSupabaseWriteConfig();
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export function hasSupabaseSalesConfig() {
  return Boolean(getSupabaseWriteConfig());
}

/**
 * @param {string} territory
 */
export async function fetchSalesFeedbackFromSupabase(territory = 'Vertrieb Ost') {
  const cfg = getSupabaseReadConfig();
  if (!cfg) return { ok: false, skipped: true };

  try {
    const params = new URLSearchParams({
      select: '*',
      territory: `eq.${territory}`,
    });
    const res = await fetch(`${cfg.url}/rest/v1/sales_feedback?${params}`, {
      headers: supabaseHeaders(cfg.key),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    const rows = await res.json();
    /** @type {Record<string, object>} */
    const map = {};
    for (const row of rows ?? []) {
      if (row.customer_id) map[row.customer_id] = row;
    }
    return { ok: true, feedback: map };
  } catch (err) {
    return { ok: false, error: err.message || 'Feedback-Lesen fehlgeschlagen' };
  }
}

/**
 * @param {string} customerId
 * @param {object} payload
 */
export async function upsertSalesFeedbackToSupabase(customerId, payload) {
  const cfg = getSupabaseWriteConfig();
  if (!cfg) return { ok: false, skipped: true };

  const row = {
    customer_id: customerId,
    lead_rating: payload.leadRating ?? null,
    visit_relevant: payload.visitRelevant ?? null,
    visit_outcome: payload.visitOutcome ?? null,
    sector_hits: payload.sectorHits ?? [],
    positive_count: payload.positiveCount ?? 0,
    negative_count: payload.negativeCount ?? 0,
    territory: payload.territory ?? 'Vertrieb Ost',
    user_id: payload.userId ?? null,
    updated_at: payload.updatedAt ?? new Date().toISOString(),
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/sales_feedback?on_conflict=customer_id`, {
      method: 'POST',
      headers: supabaseHeaders(cfg.key, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Feedback-Schreiben fehlgeschlagen' };
  }
}

/**
 * @param {string} territory
 */
export async function fetchCustomerVisitsFromSupabase(territory = 'Vertrieb Ost') {
  const cfg = getSupabaseReadConfig();
  if (!cfg) return { ok: false, skipped: true };

  try {
    const params = new URLSearchParams({
      select: '*',
      territory: `eq.${territory}`,
    });
    const res = await fetch(`${cfg.url}/rest/v1/customer_visits?${params}`, {
      headers: supabaseHeaders(cfg.key),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    const rows = await res.json();
    /** @type {Record<string, object>} */
    const map = {};
    for (const row of rows ?? []) {
      if (row.customer_id) map[row.customer_id] = row;
    }
    return { ok: true, visits: map };
  } catch (err) {
    return { ok: false, error: err.message || 'Visit-Lesen fehlgeschlagen' };
  }
}

/**
 * @param {string} customerId
 * @param {object} payload
 */
export async function upsertCustomerVisitToSupabase(customerId, payload) {
  const cfg = getSupabaseWriteConfig();
  if (!cfg) return { ok: false, skipped: true };

  const row = {
    customer_id: customerId,
    last_visit: payload.lastVisit ?? null,
    next_due: payload.nextDue ?? null,
    scheduled_visit: payload.scheduledVisit ?? null,
    notes: payload.notes ?? '',
    archived: payload.archived ?? false,
    event_type: payload.eventType ?? 'update',
    territory: payload.territory ?? 'Vertrieb Ost',
    user_id: payload.userId ?? null,
    updated_at: payload.updatedAt ?? new Date().toISOString(),
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/customer_visits?on_conflict=customer_id`, {
      method: 'POST',
      headers: supabaseHeaders(cfg.key, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Visit-Schreiben fehlgeschlagen' };
  }
}
