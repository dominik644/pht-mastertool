import { fetchScheduleProposalsByStatuses } from './supabaseScheduleProposals.js';

function resolveConfirmedSlot(proposal) {
  const slots = Array.isArray(proposal.slots) ? proposal.slots : [];
  if (proposal.confirmed_slot_id === 'custom' && proposal.custom_request) {
    const cr = proposal.custom_request;
    const date = cr.dateFrom || cr.date;
    const time = cr.timeFrom || cr.time || '09:00';
    if (!date) return null;
    return {
      id: 'custom',
      date,
      startTime: time,
      startIso: cr.startIso || `${date}T${time}:00`,
      endIso: cr.endIso || null,
    };
  }
  const byId = proposal.confirmed_slot_id
    ? slots.find((s) => s.id === proposal.confirmed_slot_id)
    : null;
  return byId || slots.find((s) => s.taken) || slots[0] || null;
}

function mapProposal(proposal) {
  const slot = resolveConfirmedSlot(proposal);
  return {
    id: proposal.id,
    status: proposal.status,
    customerId: proposal.customer_id,
    customerName: proposal.customer_name,
    customerEmail: proposal.customer_email,
    territory: proposal.territory ?? null,
    confirmedAt: proposal.confirmed_at ?? null,
    createdAt: proposal.created_at ?? null,
    expiresAt: proposal.expires_at ?? null,
    slot: slot
      ? {
          id: slot.id ?? null,
          date: slot.date ?? (slot.startIso ? String(slot.startIso).slice(0, 10) : null),
          startTime: slot.startTime ?? null,
          endTime: slot.endTime ?? null,
          startIso: slot.startIso ?? (slot.date && slot.startTime ? `${slot.date}T${slot.startTime}:00` : null),
          endIso: slot.endIso ?? null,
        }
      : null,
    slots: (proposal.slots ?? []).map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      startIso: s.startIso ?? (s.date && s.startTime ? `${s.date}T${s.startTime}:00` : null),
      taken: Boolean(s.taken),
    })),
    customRequest: proposal.custom_request ?? null,
  };
}

/**
 * GET /api/schedule-calendar-feed
 * Bestätigte, offene und Wunschtermine für den Tool-Kalender.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const result = await fetchScheduleProposalsByStatuses(['confirmed', 'pending', 'custom_request']);
  if (!result.ok) {
    return res.status(result.skipped ? 503 : 502).json({
      ok: false,
      error: result.error ?? 'Termine konnten nicht geladen werden',
      items: [],
    });
  }

  const items = (result.proposals ?? []).map(mapProposal);
  return res.status(200).json({ ok: true, items });
}
