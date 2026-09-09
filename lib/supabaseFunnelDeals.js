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

export async function fetchAllFunnelDeals() {
  const client = getClient();
  if (!client) return { ok: false, skipped: true, deals: [] };
  try {
    const res = await fetch(
      `${client.url}/rest/v1/sales_funnel_deals?select=id,owner_key,deal,updated_at`,
      { headers: headers(client.key), signal: AbortSignal.timeout(25_000) },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 200), deals: [] };
    }
    const rows = await res.json();
    const deals = (rows ?? []).map((row) => ({
      ...(row.deal && typeof row.deal === 'object' ? row.deal : {}),
      id: row.id,
      ownerKey: row.owner_key || row.deal?.ownerKey,
      updatedAt: row.deal?.updatedAt || row.updated_at,
    }));
    return { ok: true, deals };
  } catch (err) {
    return { ok: false, error: err.message || 'Lesen fehlgeschlagen', deals: [] };
  }
}

export async function upsertFunnelDealRow(deal, updatedBy) {
  const client = getClient();
  if (!client || !deal?.id) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${client.url}/rest/v1/sales_funnel_deals?on_conflict=id`, {
      method: 'POST',
      headers: headers(client.key, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        id: deal.id,
        owner_key: deal.ownerKey ?? '',
        deal,
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

export async function upsertFunnelDealRows(deals, updatedBy) {
  const client = getClient();
  if (!client) return { ok: false, skipped: true };
  const rows = (deals ?? []).filter((d) => d?.id).map((deal) => ({
    id: deal.id,
    owner_key: deal.ownerKey ?? '',
    deal,
    updated_by: updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return { ok: true, count: 0 };
  try {
    const res = await fetch(`${client.url}/rest/v1/sales_funnel_deals?on_conflict=id`, {
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

export async function deleteFunnelDealRow(id) {
  const client = getClient();
  if (!client || !id) return { ok: false, skipped: true };
  try {
    const res = await fetch(
      `${client.url}/rest/v1/sales_funnel_deals?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: headers(client.key, { Prefer: 'return=minimal' }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 200) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Löschen fehlgeschlagen' };
  }
}
