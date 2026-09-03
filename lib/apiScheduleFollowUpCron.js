/**
 * Vercel Cron: unbestätigte Terminvorschläge → Outlook-Anruf 14 Tage nach Versand.
 * Auth: CRON_SECRET (Bearer), wie /api/ingest.
 */
import { runScheduleProposalFollowUps } from './scheduleProposalFollowUp.js';
import { hasScheduleProposalStorage } from './supabaseScheduleProposals.js';

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers?.authorization || '';
  return auth === `Bearer ${secret}`;
}

export default async function apiScheduleFollowUpCronHandler(req, res) {
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

  if (!hasScheduleProposalStorage()) {
    return res.status(503).json({
      ok: false,
      skipped: true,
      error: 'Terminvorschlag-Speicher nicht konfiguriert',
    });
  }

  const started = Date.now();

  try {
    const result = await runScheduleProposalFollowUps();
    return res.status(result.ok ? 200 : 502).json({
      ...result,
      durationMs: Date.now() - started,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/schedule follow-up-cron]', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Follow-up Cron fehlgeschlagen',
      durationMs: Date.now() - started,
    });
  }
}
