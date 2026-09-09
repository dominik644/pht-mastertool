function normalizeSupabaseUrl(raw) {
  if (!raw) return null;
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

function getClient() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || !/^https?:\/\//i.test(url)) return null;
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

export function hasCustomerDetailsDb() {
  return Boolean(getClient());
}

export async function fetchAllCustomerDetails() {
  const client = getClient();
  if (!client) return { ok: false, skipped: true, details: {} };
  try {
    const res = await fetch(
      `${client.url}/rest/v1/customer_details?select=customer_id,details,updated_at`,
      { headers: headers(client.key), signal: AbortSignal.timeout(20_000) },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 200), details: {} };
    }
    const rows = await res.json();
    /** @type {Record<string, { details: object, updatedAt: string }>} */
    const map = {};
    for (const row of rows ?? []) {
      if (row.customer_id) {
        map[row.customer_id] = {
          details: row.details ?? {},
          updatedAt: row.updated_at ?? '',
        };
      }
    }
    return { ok: true, details: map };
  } catch (err) {
    return { ok: false, error: err.message || 'Lesen fehlgeschlagen', details: {} };
  }
}

export async function upsertCustomerDetails(customerId, details, updatedBy) {
  const client = getClient();
  if (!client) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${client.url}/rest/v1/customer_details?on_conflict=customer_id`, {
      method: 'POST',
      headers: headers(client.key, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        customer_id: customerId,
        details,
        updated_by: updatedBy ?? null,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 200) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Schreiben fehlgeschlagen' };
  }
}

export async function upsertCustomerDetailsBulk(entries, updatedBy) {
  const client = getClient();
  if (!client) return { ok: false, skipped: true };
  const rows = Object.entries(entries).map(([customerId, details]) => ({
    customer_id: customerId,
    details,
    updated_by: updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return { ok: true, count: 0 };
  try {
    const res = await fetch(`${client.url}/rest/v1/customer_details?on_conflict=customer_id`, {
      method: 'POST',
      headers: headers(client.key, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 200) };
    }
    return { ok: true, count: rows.length };
  } catch (err) {
    return { ok: false, error: err.message || 'Bulk-Schreiben fehlgeschlagen' };
  }
}
