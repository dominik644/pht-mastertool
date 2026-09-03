import { findCustomerById, getCadenceMonths } from './customerLookup.js';
import { fetchServerCalendarBusy } from './calendarBusyTimes.js';
import { buildRegionalDaysForSlots } from './nearbyCustomersServer.js';
import {
  buildProposalEmail,
  hasScheduleEmailConfig,
  sendScheduleEmail,
} from './scheduleEmail.js';
import { generateVisitSlots } from './scheduleSlots.js';
import {
  defaultTokenExpiryMs,
  hasScheduleTokenConfig,
  isDevScheduleTokenFallback,
  newProposalId,
  signScheduleToken,
} from './scheduleTokens.js';
import {
  hasScheduleProposalStorage,
  insertScheduleProposal,
  scheduleProposalStorageMode,
} from './supabaseScheduleProposals.js';

function getBaseUrl(req) {
  const env = process.env.SCHEDULE_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (env) {
    return env.startsWith('http') ? env.replace(/\/$/, '') : `https://${env.replace(/\/$/, '')}`;
  }
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const proto = req.headers?.['x-forwarded-proto'] || 'http';
  return host ? `${proto}://${host}` : 'http://localhost:5173';
}

function statusPayload() {
  const storage = hasScheduleProposalStorage();
  const token = hasScheduleTokenConfig();
  const email = hasScheduleEmailConfig();
  return {
    configured: storage && token,
    storage,
    storageMode: scheduleProposalStorageMode(),
    token,
    devTokenFallback: isDevScheduleTokenFallback(),
    email,
    emailPreviewFallback: !email,
  };
}

/**
 * POST /api/schedule-proposal
 * Body: { customerId, customerEmail?, territory?, salesRepEmail? }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json(statusPayload());
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const status = statusPayload();
  if (!status.configured) {
    return res.status(503).json({
      ...status,
      skipped: true,
      error: 'TerminvorschlÃ¤ge benÃ¶tigen Speicher (Supabase oder Datei) und SCHEDULE_TOKEN_SECRET',
    });
  }

  const { customerId, customerEmail, territory, salesRepEmail, busyTimes: clientBusyTimes, calendarConnected } = req.body ?? {};
  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId erforderlich' });
  }

  const customer = findCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Kunde nicht gefunden' });
  }

  const email = (customerEmail || customer.contactEmail || '').trim();
  if (!email) {
    return res.status(400).json({ error: 'Keine Kunden-E-Mail â€“ Enrichment oder Stammdaten prÃ¼fen' });
  }

  const proposalId = newProposalId();

  let busyTimes = Array.isArray(clientBusyTimes) ? clientBusyTimes : null;
  let calendarSource = calendarConnected ? 'client' : 'none';

  if (!busyTimes?.length) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 0);
    const fmt = (d) => d.toISOString().slice(0, 19);
    const serverBusy = await fetchServerCalendarBusy(fmt(start), fmt(end));
    if (serverBusy.ok && serverBusy.busyTimes.length) {
      busyTimes = serverBusy.busyTimes;
      calendarSource = serverBusy.source;
    }
  }

  const slotResult = generateVisitSlots(5, new Date(), {
    busyTimes,
    calendarConnected: Boolean(calendarConnected || (busyTimes?.length && calendarSource !== 'none')),
  });
  const slots = slotResult.slots;
  const calendarStats = { ...slotResult.stats, source: calendarSource };

  if (slots.length === 0) {
    return res.status(409).json({
      configured: true,
      error: 'Keine freien Termine in den nÃ¤chsten 2 Wochen gefunden',
      calendar: calendarStats,
    });
  }

  const exp = Date.now() + defaultTokenExpiryMs();
  const expiresAt = new Date(exp).toISOString();
  const terr = territory ?? customer.salesRep ?? 'Vertrieb Ost';
  const salesEmail = salesRepEmail ?? process.env.SCHEDULE_SALES_NOTIFY_EMAIL ?? process.env.INGEST_ALERT_EMAIL ?? 'weller@pht.group';

  const insertResult = await insertScheduleProposal({
    id: proposalId,
    customer_id: customerId,
    customer_name: customer.name,
    customer_email: email,
    slots,
    status: 'pending',
    territory: terr,
    sales_rep_email: salesEmail,
    expires_at: expiresAt,
  });

  if (!insertResult.ok) {
    return res.status(insertResult.skipped ? 503 : 502).json({
      configured: true,
      error: insertResult.error,
    });
  }

  const baseUrl = getBaseUrl(req);
  const signToken = (slotId) =>
    signScheduleToken({ proposalId, slotId, customerId, exp });

  const regionalDays = buildRegionalDaysForSlots(customer, slots.map((s) => s.date));

  let mailContent;
  try {
    mailContent = buildProposalEmail({
      customerName: customer.name,
      customerEmail: email,
      slots,
      baseUrl,
      proposalId,
      signToken,
      regionalDays,
    });
  } catch (err) {
    return res.status(502).json({
      configured: true,
      proposalId,
      error: err instanceof Error ? err.message : 'E-Mail-Inhalt konnte nicht erstellt werden',
    });
  }

  const sendResult = await sendScheduleEmail({
    to: email,
    subject: mailContent.subject,
    html: mailContent.html,
    text: mailContent.text,
    slotOptions: mailContent.slotOptions,
  });

  if (!sendResult.ok) {
    return res.status(sendResult.skipped ? 503 : 502).json({
      configured: true,
      proposalId,
      error: sendResult.error ?? 'E-Mail konnte nicht gesendet werden',
    });
  }

  if (sendResult.preview) {
    return res.status(200).json({
      configured: true,
      ok: true,
      preview: true,
      proposalId,
      slotCount: slots.length,
      slotOptions: mailContent.slotOptions,
      calendar: calendarStats,
      sentTo: email,
      cadenceMonths: getCadenceMonths(customer.priority),
      storageMode: status.storageMode,
      emailPreview: {
        subject: sendResult.subject,
        html: sendResult.html,
        text: sendResult.text,
        mailtoUrl: sendResult.mailtoUrl,
      },
      message: 'E-Mail-Vorschau erstellt â€“ bitte manuell senden (kein RESEND_API_KEY)',
    });
  }

  return res.status(200).json({
    configured: true,
    ok: true,
    proposalId,
    slotCount: slots.length,
    slotOptions: mailContent.slotOptions,
    calendar: calendarStats,
    sentTo: email,
    cadenceMonths: getCadenceMonths(customer.priority),
    message: `TerminvorschlÃ¤ge (${slots.length} Slots) an ${email} gesendet`,
  });
}
