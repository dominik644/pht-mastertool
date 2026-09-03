import { formatDateGerman } from './scheduleSlots.js';
import { buildSalesNotificationEmail, sendScheduleEmail } from './scheduleEmail.js';
import { createConfirmedVisitCalendarEvent } from './scheduleCalendarEvent.js';
import { findCustomerById } from './customerLookup.js';
import {
  fetchScheduleProposal,
  updateScheduleProposal,
} from './supabaseScheduleProposals.js';
import { upsertCustomerVisitToSupabase } from './supabaseSalesSync.js';

function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function buildSlotFromCustomRequest(customRequest) {
  const date = customRequest.dateFrom;
  const startTime = customRequest.timeFrom;
  const endTime = customRequest.timeTo || addMinutesToTime(startTime, 45);
  return {
    id: 'custom',
    date,
    startTime,
    endTime,
    startIso: `${date}T${startTime}:00`,
    endIso: `${date}T${endTime}:00`,
  };
}

function formatCustomRequestGerman(cr) {
  const datePart = cr.dateTo && cr.dateTo !== cr.dateFrom
    ? `${formatDateGerman(cr.dateFrom)} – ${formatDateGerman(cr.dateTo)}`
    : formatDateGerman(cr.dateFrom);
  const timePart = cr.timeTo
    ? `${cr.timeFrom}–${cr.timeTo} Uhr`
    : `${cr.timeFrom} Uhr`;
  return `${datePart}, ${timePart}`;
}

/**
 * POST /api/schedule-wish-accept
 * Body: { proposalId }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { proposalId } = req.body ?? {};
  if (!proposalId || typeof proposalId !== 'string') {
    return res.status(400).json({ error: 'proposalId erforderlich' });
  }

  const loaded = await fetchScheduleProposal(proposalId);
  if (!loaded.ok) {
    return res.status(loaded.skipped ? 503 : 404).json({ error: loaded.error ?? 'Vorschlag nicht gefunden' });
  }

  const proposal = loaded.proposal;
  if (proposal.status !== 'custom_request' || !proposal.custom_request) {
    return res.status(409).json({ error: 'Kein offener Wunschtermin für diesen Vorschlag' });
  }

  const customRequest = proposal.custom_request;
  const slot = buildSlotFromCustomRequest(customRequest);
  const whenLabel = formatCustomRequestGerman(customRequest);
  const noteLine = `Termin bestätigt (Wunschtermin): ${whenLabel}${customRequest.message ? ` – „${customRequest.message}"` : ''}`;

  const patchResult = await updateScheduleProposal(proposalId, {
    status: 'confirmed',
    confirmed_slot_id: 'custom',
    confirmed_at: new Date().toISOString(),
    custom_request: { ...customRequest, acceptedAt: new Date().toISOString() },
  });

  if (!patchResult.ok) {
    return res.status(502).json({ error: patchResult.error ?? 'Konnte nicht bestätigt werden' });
  }

  await upsertCustomerVisitToSupabase(proposal.customer_id, {
    lastVisit: null,
    nextDue: slot.date,
    scheduledVisit: slot.startIso,
    notes: noteLine,
    archived: false,
    eventType: 'schedule_wish_accept',
    territory: proposal.territory ?? 'Vertrieb Ost',
    updatedAt: new Date().toISOString(),
  });

  const customer = findCustomerById(proposal.customer_id);
  const location = customer
    ? `${customer.zip} ${customer.city}`.trim()
    : '';

  await createConfirmedVisitCalendarEvent({
    customerName: proposal.customer_name,
    customerEmail: proposal.customer_email,
    slot,
    location,
  });

  void sendScheduleEmail({
    to: proposal.customer_email,
    subject: `Termin bestätigt: ${whenLabel} – PHT`,
    html: `<p>Ihr Wunschtermin bei PHT ist bestätigt:</p><p><strong>${whenLabel}</strong></p><p>Wir freuen uns auf das Gespräch.</p><p><a href="https://pht.group">pht.group</a></p>`,
    text: `Ihr Wunschtermin bei PHT ist bestätigt: ${whenLabel}. Wir freuen uns auf das Gespräch.\n\nDominik Weller · PHT Group · https://pht.group`,
  });

  const salesEmail = proposal.sales_rep_email;
  if (salesEmail) {
    void sendScheduleEmail({
      to: salesEmail,
      ...buildSalesNotificationEmail({
        salesEmail,
        customerName: proposal.customer_name,
        slot,
        customerEmail: proposal.customer_email,
      }),
    });
  }

  return res.status(200).json({
    ok: true,
    customerId: proposal.customer_id,
    scheduledVisit: slot.startIso,
    nextDue: slot.date,
    notes: noteLine,
  });
}
