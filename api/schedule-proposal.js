import { findCustomerById, getCadenceMonths } from '../lib/customerLookup.js';
import {
  buildProposalEmail,
  hasScheduleEmailConfig,
  sendScheduleEmail,
} from '../lib/scheduleEmail.js';
import { generateVisitSlots } from '../lib/scheduleSlots.js';
import {
  defaultTokenExpiryMs,
  hasScheduleTokenConfig,
  isDevScheduleTokenFallback,
  newProposalId,
  signScheduleToken,
} from '../lib/scheduleTokens.js';
import {
  hasScheduleProposalStorage,
  insertScheduleProposal,
  scheduleProposalStorageMode,
} from '../lib/supabaseScheduleProposals.js';

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
      error: 'Terminvorschläge benötigen Speicher (Supabase oder Datei) und SCHEDULE_TOKEN_SECRET',
    });
  }

  const { customerId, customerEmail, territory, salesRepEmail } = req.body ?? {};
  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId erforderlich' });
  }

  const customer = findCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Kunde nicht gefunden' });
  }

  const email = (customerEmail || customer.contactEmail || '').trim();
  if (!email) {
    return res.status(400).json({ error: 'Keine Kunden-E-Mail – Enrichment oder Stammdaten prüfen' });
  }

  const proposalId = newProposalId();
  const slots = generateVisitSlots(5);
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

  const mailContent = buildProposalEmail({
    customerName: customer.name,
    customerEmail: email,
    slots,
    baseUrl,
    proposalId,
    signToken,
  });

  const sendResult = await sendScheduleEmail({
    to: email,
    subject: mailContent.subject,
    html: mailContent.html,
    text: mailContent.text,
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
      sentTo: email,
      cadenceMonths: getCadenceMonths(customer.priority),
      storageMode: status.storageMode,
      emailPreview: {
        subject: sendResult.subject,
        html: sendResult.html,
        text: sendResult.text,
        mailtoUrl: sendResult.mailtoUrl,
      },
      message: 'E-Mail-Vorschau erstellt – bitte manuell senden (kein RESEND_API_KEY)',
    });
  }

  return res.status(200).json({
    configured: true,
    ok: true,
    proposalId,
    slotCount: slots.length,
    sentTo: email,
    cadenceMonths: getCadenceMonths(customer.priority),
    message: `Terminvorschläge (${slots.length} Slots) an ${email} gesendet`,
  });
}
