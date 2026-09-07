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
  return /snapaddy_inbox|PGRST205|relation.*does not exist|Could not find the table/i.test(String(text ?? ''));
}

export async function insertSupabaseSnapaddyCard(card) {
  const cfg = getConfig();
  if (!cfg) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${cfg.url}/rest/v1/snapaddy_inbox`, {
      method: 'POST',
      headers: headers(cfg.key, { Prefer: 'return=minimal' }),
      body: JSON.stringify({
        id: card.id,
        payload: card,
        status: card.status || 'pending',
        received_at: card.receivedAt,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const text = await res.text();
      if (isTableMissing(res.status, text)) return { ok: false, skipped: true };
      return { ok: false, error: text.slice(0, 180) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, skipped: true, error: err.message };
  }
}

export async function listSupabasePendingSnapaddyCards() {
  const cfg = getConfig();
  if (!cfg) return [];
  try {
    const params = new URLSearchParams({
      select: 'payload',
      status: 'eq.pending',
      order: 'received_at.desc',
    });
    const res = await fetch(`${cfg.url}/rest/v1/snapaddy_inbox?${params}`, {
      headers: headers(cfg.key),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : [])
      .map((r) => r?.payload)
      .filter((c) => c && c.id);
  } catch {
    return [];
  }
}

export async function updateSupabaseSnapaddyCardStatus(id, status) {
  const cfg = getConfig();
  if (!cfg) return false;
  try {
    const params = new URLSearchParams({ id: `eq.${id}` });
    const res = await fetch(`${cfg.url}/rest/v1/snapaddy_inbox?${params}`, {
      method: 'PATCH',
      headers: headers(cfg.key, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
