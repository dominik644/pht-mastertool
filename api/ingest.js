/**
 * Phase B – geplanter Tender-Ingest (Vercel Cron 06:00 UTC / manueller Trigger)
 * Lädt alle Live-Provider server-seitig; Bulk-Artefakte werden täglich via GitHub Actions
 * in public/data/bulk/ aktualisiert (nicht hier neu heruntergeladen – Vercel-Timeout).
 */
import { loadAllTenders } from '../lib/tenders/index.js';
import { runIngestAlerts } from '../lib/ingestAlerts.js';
import { hasSupabaseConfig, setIngestState, upsertTendersToSupabase } from '../lib/supabaseIngest.js';
import { ensureAppUsersTable } from '../lib/appUsersMigration.js';
import { checkHunterAccount, enrichContactViaHunter, hunterConfigured } from '../lib/contactEnrichmentApi.js';

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

  const setup = req.query?.setup;
  if (setup === 'app-users') {
    try {
      const migration = await ensureAppUsersTable();
      if (migration.ok) {
        return res.status(200).json({
          ok: true,
          setup: 'app-users',
          existed: migration.existed ?? false,
          method: migration.method,
          message: migration.existed
            ? 'Tabelle app_users existiert bereits'
            : 'Tabelle app_users wurde angelegt',
        });
      }
      return res.status(500).json({
        ok: false,
        setup: 'app-users',
        error: migration.error,
        project: migration.project,
        hints: migration.hints,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        setup: 'app-users',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (setup === 'hunter') {
    try {
      const account = await checkHunterAccount();
      if (!account.ok) {
        return res.status(account.configured ? 502 : 503).json({
          ok: false,
          setup: 'hunter',
          configured: hunterConfigured(),
          error: account.error,
          hint: 'HUNTER_API_KEY in Vercel Environment Variables setzen (https://hunter.io/api-keys)',
        });
      }
      const testLimit = Math.min(Number(req.query?.test) || 0, 5);
      const samples = testLimit > 0
        ? await Promise.all(
          [
            { name: 'Manner GmbH', country: 'AT' },
            { name: 'Pfanner', country: 'AT' },
            { name: 'Bonduelle', country: 'DE' },
          ].slice(0, testLimit).map(async (c) => ({
            name: c.name,
            hit: await enrichContactViaHunter(c),
          })),
        )
        : [];

      return res.status(200).json({
        ok: true,
        setup: 'hunter',
        account,
        samples,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        setup: 'hunter',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const started = Date.now();

  try {
    const result = await loadAllTenders();
    const supabaseEnabled = hasSupabaseConfig();
    let supabase = {
      enabled: supabaseEnabled,
      skipped: !supabaseEnabled,
      setupHint: supabaseEnabled
        ? undefined
        : 'Optional: SUPABASE_URL + SUPABASE_SERVICE_KEY in Vercel setzen, supabase/schema.sql im SQL Editor ausführen',
    };

    if (supabaseEnabled && result.tenders.length) {
      const upsert = await upsertTendersToSupabase(result.tenders);
      supabase = { enabled: true, ...upsert };
    }

    await setIngestState('last_ingest', {
      providerCount: result.providerCount,
      total: result.total,
      ingestedAt: new Date().toISOString(),
      liveProviders: result.liveProviders,
    });

    const alerts = await runIngestAlerts(result.tenders);

    return res.status(200).json({
      ok: true,
      ingestedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      total: result.total,
      providerCount: result.providerCount,
      liveProviders: result.liveProviders,
      regions: result.regions,
      lastBulkUpdate: result.lastBulkUpdate || null,
      bulkStale: result.bulkStale ?? null,
      errors: result.error || null,
      supabase,
      alerts,
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
