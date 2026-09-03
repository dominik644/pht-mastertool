import {
  buildCustomerConfirmationEmail,
  buildSalesNotificationEmail,
  sendScheduleEmail,
} from './scheduleEmail.js';
import { formatSlotGerman } from './scheduleSlots.js';
import { verifyScheduleToken } from './scheduleTokens.js';
import {
  fetchScheduleProposal,
  updateScheduleProposal,
} from './supabaseScheduleProposals.js';
import { upsertCustomerVisitToSupabase } from './supabaseSalesSync.js';

function renderHtml(title, body, variant = 'success') {
  const accent = variant === 'error' ? '#b91c1c' : '#1e6b4a';
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#0f1419;color:#e2e8f0;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="max-width:480px;width:100%;background:#1a2332;border:1px solid #2d3748;border-radius:16px;padding:32px;text-align:center">
    <div style="width:48px;height:48px;border-radius:50%;background:${accent}22;border:2px solid ${accent};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px">${variant === 'error' ? 'âœ•' : 'âœ“'}</div>
    <h1 style="font-size:1.25rem;margin:0 0 12px;color:#fff">${title}</h1>
    <p style="color:#94a3b8;line-height:1.6;margin:0">${body}</p>
    <p style="margin-top:24px;font-size:0.75rem;color:#64748b">PHT â€“ PlanungsbÃ¼ro fÃ¼r Hygiene-Technik</p>
  </div>
</body>
</html>`;
}

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
      renderHtml('Link ungÃ¼ltig', verified.error, 'error'),
    );
  }

  const { proposalId, slotId, customerId } = verified.payload;

  const loaded = await fetchScheduleProposal(proposalId);
  if (!loaded.ok) {
    return sendHtml(
      res,
      loaded.skipped ? 503 : 404,
      renderHtml('Terminvorschlag nicht verfÃ¼gbar', loaded.error ?? 'Bitte kontaktieren Sie PHT direkt.', 'error'),
    );
  }

  const proposal = loaded.proposal;
  if (proposal.status === 'confirmed') {
    return sendHtml(
      res,
      409,
      renderHtml('Termin bereits gebucht', 'Dieser Terminvorschlag wurde bereits bestÃ¤tigt.', 'error'),
    );
  }

  if (proposal.customer_id !== customerId) {
    return sendHtml(res, 403, renderHtml('Zugriff verweigert', 'UngÃ¼ltiger Link.', 'error'));
  }

  if (new Date(proposal.expires_at) < new Date()) {
    return sendHtml(res, 410, renderHtml('Link abgelaufen', 'Bitte kontaktieren Sie uns fÃ¼r neue TerminvorschlÃ¤ge.', 'error'));
  }

  /** @type {Array<{id:string,taken?:boolean}>} */
  const slots = proposal.slots ?? [];
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) {
    return sendHtml(res, 404, renderHtml('Termin nicht gefunden', 'Der gewÃ¤hlte Slot existiert nicht mehr.', 'error'));
  }
  if (slot.taken) {
    return sendHtml(res, 409, renderHtml('Termin vergeben', 'Dieser Termin wurde bereits gebucht. Bitte wÃ¤hlen Sie einen anderen.', 'error'));
  }

  const updatedSlots = slots.map((s) => (s.id === slotId ? { ...s, taken: true } : s));
  const patchResult = await updateScheduleProposal(proposalId, {
    status: 'confirmed',
    confirmed_slot_id: slotId,
    confirmed_at: new Date().toISOString(),
    slots: updatedSlots,
  });

  if (!patchResult.ok) {
    return sendHtml(res, 502, renderHtml('Fehler', patchResult.error ?? 'Termin konnte nicht gespeichert werden.', 'error'));
  }

  const visitDate = slot.date;
  const noteLine = `Termin bestÃ¤tigt (Kunde): ${formatSlotGerman(slot)}`;

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
  const title = `Termin bestÃ¤tigt: ${d}.${m}.${y} ${slot.startTime}`;
  const body = `Vielen Dank! Ihr Besuch bei PHT ist am <strong>${d}.${m}.${y}</strong> um <strong>${slot.startTime} Uhr</strong> eingeplant (ca. 45 Min.). Wir freuen uns auf das GesprÃ¤ch.`;

  return sendHtml(res, 200, renderHtml(title, body));
}
