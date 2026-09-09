import { existsSync, readFileSync } from 'node:fs';
import { customerPrioritiesPath } from '../lib/customerDataFiles.js';
import { guardAppAuth } from '../lib/appAuth.js';
import {
  fetchAllCustomerDetails,
  upsertCustomerDetails,
  upsertCustomerDetailsBulk,
} from '../lib/supabaseCustomerDetails.js';
import {
  deleteFunnelDealRow,
  fetchAllFunnelDeals,
  upsertFunnelDealRow,
  upsertFunnelDealRows,
} from '../lib/supabaseFunnelDeals.js';
import {
  fetchCustomerVisitsFromSupabase,
  fetchSalesFeedbackFromSupabase,
  hasSupabaseSalesConfig,
  upsertCustomerVisitToSupabase,
  upsertSalesFeedbackToSupabase,
} from '../lib/supabaseSalesSync.js';

let prioritiesCache = null;

function loadPriorities() {
  if (!prioritiesCache) {
    const file = customerPrioritiesPath();
    if (!existsSync(file)) return null;
    prioritiesCache = JSON.parse(readFileSync(file, 'utf8'));
  }
  return prioritiesCache;
}

/**
 * GET /api/sales-sync?type=feedback|visits|priorities|details
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
    const type = req.query?.type ?? 'feedback';
    if (type === 'priorities') {
      const data = loadPriorities();
      if (!data) return res.status(404).json({ error: 'Kundendaten nicht gefunden' });
      return res.status(200).json(data);
    }
    if (type === 'details') {
      const result = await fetchAllCustomerDetails();
      if (result.skipped) return res.status(200).json({ ok: true, skipped: true, details: {} });
      if (!result.ok) return res.status(502).json({ ok: false, error: result.error, details: {} });
      return res.status(200).json({ ok: true, details: result.details });
    }
    if (type === 'funnel') {
      const result = await fetchAllFunnelDeals();
      if (result.skipped) return res.status(200).json({ ok: true, skipped: true, deals: [] });
      if (!result.ok) return res.status(502).json({ ok: false, error: result.error, deals: [] });
      return res.status(200).json({ ok: true, deals: result.deals });
    }
    if (!configured) {
      return res.status(503).json({ configured: false, skipped: true, error: 'Supabase nicht konfiguriert' });
    }
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

  const { type, customerId, payload, territory, store, id } = req.body ?? {};

  if (type === 'funnel-delete') {
    const dealId = typeof id === 'string' ? id : customerId;
    if (!dealId) return res.status(400).json({ error: 'id erforderlich' });
    const result = await deleteFunnelDealRow(dealId);
    if (result.skipped) return res.status(200).json({ ok: true, skipped: true });
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true });
  }

  if (type === 'funnel-bulk' && Array.isArray(payload)) {
    const result = await upsertFunnelDealRows(payload, guard.user?.email);
    if (result.skipped) return res.status(200).json({ ok: true, skipped: true });
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true, count: result.count });
  }

  if (type === 'funnel') {
    const deal = payload && typeof payload === 'object' ? payload : null;
    if (!deal?.id) return res.status(400).json({ error: 'Funnel-Deal fehlt' });
    const result = await upsertFunnelDealRow(deal, guard.user?.email);
    if (result.skipped) return res.status(200).json({ ok: true, skipped: true });
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true });
  }

  if (type === 'details-bulk' && store && typeof store === 'object') {
    const result = await upsertCustomerDetailsBulk(store, guard.user?.email);
    if (result.skipped) return res.status(200).json({ ok: true, skipped: true });
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true, count: result.count });
  }

  if (type === 'details') {
    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'customerId erforderlich' });
    }
    const result = await upsertCustomerDetails(customerId, payload ?? {}, guard.user?.email);
    if (result.skipped) return res.status(200).json({ ok: true, skipped: true });
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true });
  }

  if (!configured) {
    return res.status(503).json({ configured: false, skipped: true, error: 'Supabase nicht konfiguriert' });
  }

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
