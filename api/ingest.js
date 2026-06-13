/**
 * Phase B – geplanter Tender-Ingest (Vercel Cron / manueller Trigger)
 * Lädt alle Live-Provider server-seitig, optional Supabase-Upsert.
 */
import { loadAllTenders } from '../lib/tenders/index.js';
import { hasSupabaseConfig, upsertTendersToSupabase } from '../lib/supabaseIngest.js';

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers?.authorization || '';
  return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized – CRON_SECRET erforderlich' });
  }

  const started = Date.now();

  try {
    const result = await loadAllTenders();
    const supabaseEnabled = hasSupabaseConfig();
    let supabase = { enabled: supabaseEnabled, skipped: !supabaseEnabled };

    if (supabaseEnabled && result.tenders.length) {
      const upsert = await upsertTendersToSupabase(result.tenders);
      supabase = { enabled: true, ...upsert };
    }

    return res.status(200).json({
      ok: true,
      ingestedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      total: result.total,
      providerCount: result.providerCount,
      liveProviders: result.liveProviders,
      regions: result.regions,
      errors: result.error || null,
      supabase,
    });
  } catch (err) {
    console.error('[api/ingest]', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Ingest fehlgeschlagen',
      durationMs: Date.now() - started,
    });
  }
}
