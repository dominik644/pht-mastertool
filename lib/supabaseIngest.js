/**
 * Supabase-Bulk-Upsert für Phase-B-Ingest (optional, nur wenn Env gesetzt)
 */

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
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
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
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
