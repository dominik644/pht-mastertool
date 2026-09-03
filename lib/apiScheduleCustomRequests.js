import { fetchScheduleProposalsByStatus } from './supabaseScheduleProposals.js';

/**
 * GET /api/schedule-custom-requests?status=custom_request
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const status = String(req.query?.status ?? 'custom_request');
  const result = await fetchScheduleProposalsByStatus(status);
  if (!result.ok) {
    return res.status(result.skipped ? 503 : 502).json({ error: result.error ?? 'Anfragen konnten nicht geladen werden' });
  }

  const requests = (result.proposals ?? []).map((p) => ({
    proposalId: p.id,
    customerId: p.customer_id,
    customerName: p.customer_name,
    customerEmail: p.customer_email,
    territory: p.territory,
    customRequest: p.custom_request ?? null,
    submittedAt: p.custom_request?.submittedAt ?? p.created_at,
    expiresAt: p.expires_at,
  }));

  return res.status(200).json({ ok: true, requests });
}
