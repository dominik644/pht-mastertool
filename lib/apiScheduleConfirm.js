import {
  buildCustomerConfirmationEmail,
  buildSalesNotificationEmail,
  sendScheduleEmail,
} from './scheduleEmail.js';
import { createConfirmedVisitCalendarEvent } from './scheduleCalendarEvent.js';
import { findCustomerById } from './customerLookup.js';
import { formatSlotGerman } from './scheduleSlots.js';
import { buildBrandedPage, weekdayLabelGerman } from './scheduleEmailTemplate.js';
import { verifyScheduleToken } from './scheduleTokens.js';
import {
  fetchScheduleProposal,
  updateScheduleProposal,
} from './supabaseScheduleProposals.js';
import { upsertCustomerVisitToSupabase } from './supabaseSalesSync.js';

function sendHtml(res, status, html) {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

/**
 * GET /api/schedule-confirm?token=...
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query?.token;
  const verified = verifyScheduleToken(String(token ?? ''));
  if (!verified.ok) {
    return sendHtml(
      res,
      400,
      buildBrandedPage({
        title: 'Link ungültig',
        bodyHtml: `<p>${verified.error}</p><p style="margin-top:16px;font-size:13px">Bitte kontaktieren Sie uns unter <a href="mailto:weller@pht.group" style="color:#60a5fa">weller@pht.group</a>.</p>`,
        variant: 'error',
      }),
    );
  }

  const { proposalId, slotId, customerId } = verified.payload;

  const loaded = await fetchScheduleProposal(proposalId);
  if (!loaded.ok) {
    return sendHtml(
      res,
      loaded.skipped ? 503 : 404,
      buildBrandedPage({
        title: 'Terminvorschlag nicht verfügbar',
        bodyHtml: `<p>${loaded.error ?? 'Bitte kontaktieren Sie PHT direkt.'}</p>`,
        variant: 'error',
      }),
    );
  }

  const proposal = loaded.proposal;
  if (proposal.status === 'confirmed') {
    return sendHtml(
      res,
      409,
      buildBrandedPage({
        title: 'Termin bereits gebucht',
        bodyHtml: '<p>Dieser Terminvorschlag wurde bereits bestätigt. Bei Fragen erreichen Sie uns unter <a href="mailto:weller@pht.group" style="color:#60a5fa">weller@pht.group</a>.</p>',
        variant: 'error',
      }),
    );
  }

  if (proposal.customer_id !== customerId) {
    return sendHtml(res, 403, buildBrandedPage({ title: 'Zugriff verweigert', bodyHtml: '<p>Ungültiger Link.</p>', variant: 'error' }));
  }

  if (new Date(proposal.expires_at) < new Date()) {
    return sendHtml(
      res,
      410,
      buildBrandedPage({
        title: 'Link abgelaufen',
        bodyHtml: '<p>Bitte kontaktieren Sie uns für neue Terminvorschläge unter <a href="mailto:weller@pht.group" style="color:#60a5fa">weller@pht.group</a>.</p>',
        variant: 'error',
      }),
    );
  }

  /** @type {Array<{id:string,taken?:boolean}>} */
  const slots = proposal.slots ?? [];
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) {
    return sendHtml(
      res,
      404,
      buildBrandedPage({ title: 'Termin nicht gefunden', bodyHtml: '<p>Der gewählte Slot existiert nicht mehr.</p>', variant: 'error' }),
    );
  }
  if (slot.taken) {
    return sendHtml(
      res,
      409,
      buildBrandedPage({
        title: 'Termin vergeben',
        bodyHtml: '<p>Dieser Termin wurde bereits gebucht. Bitte wählen Sie einen anderen Vorschlag aus der E-Mail.</p>',
        variant: 'error',
      }),
    );
  }

  const updatedSlots = slots.map((s) => (s.id === slotId ? { ...s, taken: true } : s));
  const patchResult = await updateScheduleProposal(proposalId, {
    status: 'confirmed',
    confirmed_slot_id: slotId,
    confirmed_at: new Date().toISOString(),
    slots: updatedSlots,
  });

  if (!patchResult.ok) {
    return sendHtml(
      res,
      502,
      buildBrandedPage({ title: 'Fehler', bodyHtml: `<p>${patchResult.error ?? 'Termin konnte nicht gespeichert werden.'}</p>`, variant: 'error' }),
    );
  }

  const visitDate = slot.date;
  const noteLine = `Termin bestätigt (Kunde): ${formatSlotGerman(slot)}`;

  await upsertCustomerVisitToSupabase(customerId, {
    lastVisit: null,
    nextDue: visitDate,
    scheduledVisit: slot.startIso,
    notes: noteLine,
    archived: false,
    eventType: 'schedule_confirm',
    territory: proposal.territory ?? 'Vertrieb Ost',
    updatedAt: new Date().toISOString(),
  });

  const customer = findCustomerById(customerId);
  const location = customer
    ? `${customer.zip} ${customer.city}`.trim()
    : '';

  const calendarEvent = await createConfirmedVisitCalendarEvent({
    customerName: proposal.customer_name,
    customerEmail: proposal.customer_email,
    slot,
    location,
  });

  void sendScheduleEmail({
    to: proposal.customer_email,
    ...buildCustomerConfirmationEmail({ customerName: proposal.customer_name, slot }),
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

  const [y, m, d] = slot.date.split('-');
  const weekday = weekdayLabelGerman(slot.date);
  const title = `Termin bestätigt – ${d}.${m}.${y}`;
  const icsDataUri = calendarEvent.ics
    ? `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarEvent.ics)}`
    : null;
  const calendarNote = calendarEvent.ok
    ? '<p style="font-size:13px;color:#10b981;margin-top:12px">Der Termin wurde in unseren Kalender eingetragen.</p>'
    : icsDataUri
      ? `<p style="font-size:13px;margin-top:12px"><a href="${icsDataUri}" download="pht-termin.ics" style="color:#60a5fa">Kalendereinladung herunterladen</a></p>`
      : '';
  const bodyHtml = `
    <p>Vielen Dank! Ihr Besuch bei <strong style="color:#fff">PHT</strong> ist eingeplant:</p>
    <p style="margin:20px 0;padding:16px;background:#1a2234;border-radius:12px;border:1px solid #243044">
      <span style="display:block;font-size:12px;color:#60a5fa;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${weekday}</span>
      <strong style="font-size:1.25rem;color:#fff">${d}.${m}.${y}</strong>
      <span style="display:block;margin-top:4px;color:#e2e8f0">${slot.startTime} Uhr · ca. 45 Minuten</span>
    </p>
    <p style="font-size:14px">Wir freuen uns auf das Gespräch bei <strong style="color:#fff">${proposal.customer_name}</strong>.</p>
    <p style="font-size:13px;margin-top:16px">Sie erhalten in Kürze eine Bestätigung per E-Mail. Bei Rückfragen: <a href="mailto:weller@pht.group" style="color:#60a5fa">weller@pht.group</a></p>
    ${calendarNote}`;

  return sendHtml(
    res,
    200,
    buildBrandedPage({ title, bodyHtml, variant: 'success' }),
  );
}
