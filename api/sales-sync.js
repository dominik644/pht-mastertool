import {
  fetchCustomerVisitsFromSupabase,
  fetchSalesFeedbackFromSupabase,
  hasSupabaseSalesConfig,
  upsertCustomerVisitToSupabase,
  upsertSalesFeedbackToSupabase,
} from '../lib/supabaseSalesSync.js';
import { guardAppAuth } from '../lib/appAuth.js';

/**
 * GET /api/sales-sync?type=feedback|visits&territory=Vertrieb+Ost
 * POST /api/sales-sync { type, territory, customerId, payload }
 */
export default async function handler(req, res) {
  const guard = guardAppAuth(req, res);
  if (!guard.ok) return;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const configured = hasSupabaseSalesConfig();

  if (req.method === 'GET') {
    if (!configured) {
      return res.status(503).json({ configured: false, skipped: true, error: 'Supabase nicht konfiguriert' });
    }
    const type = req.query?.type ?? 'feedback';
    const territory = req.query?.territory ?? 'Vertrieb Ost';
    if (type === 'visits') {
      const result = await fetchCustomerVisitsFromSupabase(String(territory));
      if (!result.ok) return res.status(result.skipped ? 503 : 502).json({ configured: true, ...result });
      return res.status(200).json({ configured: true, visits: result.visits });
    }
    const result = await fetchSalesFeedbackFromSupabase(String(territory));
    if (!result.ok) return res.status(result.skipped ? 503 : 502).json({ configured: true, ...result });
    return res.status(200).json({ configured: true, feedback: result.feedback });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!configured) {
    return res.status(503).json({ configured: false, skipped: true, error: 'Supabase nicht konfiguriert' });
  }

  const { type, customerId, payload, territory } = req.body ?? {};
  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId erforderlich' });
  }

  const enriched = { ...(payload ?? {}), territory: territory ?? 'Vertrieb Ost' };

  if (type === 'visit') {
    const result = await upsertCustomerVisitToSupabase(customerId, enriched);
    if (!result.ok) return res.status(502).json({ configured: true, ...result });
    return res.status(200).json({ configured: true, ok: true });
  }

  const result = await upsertSalesFeedbackToSupabase(customerId, enriched);
  if (!result.ok) return res.status(502).json({ configured: true, ...result });
  return res.status(200).json({ configured: true, ok: true });
}
