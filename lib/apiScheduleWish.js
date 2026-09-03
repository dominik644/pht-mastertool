import {
  buildSalesCustomRequestEmail,
  sendScheduleEmail,
} from './scheduleEmail.js';
import { buildBrandedPage, buildWishFormPage, buildWishThankYouPage } from './scheduleEmailTemplate.js';
import { verifyWishToken } from './scheduleTokens.js';
import {
  fetchScheduleProposal,
  updateScheduleProposal,
} from './supabaseScheduleProposals.js';

function sendHtml(res, status, html) {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}

/**
 * GET /api/schedule-wish?token=...  – wish form
 * POST /api/schedule-wish?token=... – submit custom request
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(req.query?.token ?? '');
  const verified = verifyWishToken(token);
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

  const { proposalId, customerId } = verified.payload;

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
        bodyHtml: '<p>Für diesen Terminvorschlag wurde bereits ein Termin vereinbart.</p>',
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

  if (req.method === 'GET') {
    if (proposal.status === 'custom_request') {
      return sendHtml(res, 200, buildWishThankYouPage());
    }
    return sendHtml(
      res,
      200,
      buildWishFormPage({
        customerName: proposal.customer_name,
        token,
      }),
    );
  }

  const body = parseBody(req);
  const dateFrom = String(body.dateFrom ?? '').trim();
  const dateTo = String(body.dateTo ?? '').trim() || null;
  const timeFrom = String(body.timeFrom ?? '').trim();
  const timeTo = String(body.timeTo ?? '').trim() || null;
  const message = String(body.message ?? '').trim().slice(0, 2000);

  if (!dateFrom || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    return sendHtml(
      res,
      400,
      buildBrandedPage({ title: 'Datum fehlt', bodyHtml: '<p>Bitte wählen Sie ein gültiges Datum.</p>', variant: 'error' }),
    );
  }
  if (!timeFrom || !/^\d{2}:\d{2}$/.test(timeFrom)) {
    return sendHtml(
      res,
      400,
      buildBrandedPage({ title: 'Uhrzeit fehlt', bodyHtml: '<p>Bitte geben Sie eine gültige Uhrzeit an (HH:MM).</p>', variant: 'error' }),
    );
  }
  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return sendHtml(res, 400, buildBrandedPage({ title: 'Ungültiger Zeitraum', bodyHtml: '<p>Enddatum ungültig.</p>', variant: 'error' }));
  }
  if (timeTo && !/^\d{2}:\d{2}$/.test(timeTo)) {
    return sendHtml(res, 400, buildBrandedPage({ title: 'Ungültige Uhrzeit', bodyHtml: '<p>End-Uhrzeit ungültig (HH:MM).</p>', variant: 'error' }));
  }

  const customRequest = {
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
    message,
    submittedAt: new Date().toISOString(),
  };

  const patchResult = await updateScheduleProposal(proposalId, {
    status: 'custom_request',
    custom_request: customRequest,
  });

  if (!patchResult.ok) {
    return sendHtml(
      res,
      502,
      buildBrandedPage({ title: 'Fehler', bodyHtml: `<p>${patchResult.error ?? 'Wunschtermin konnte nicht gespeichert werden.'}</p>`, variant: 'error' }),
    );
  }

  const salesEmail = proposal.sales_rep_email ?? process.env.SCHEDULE_SALES_NOTIFY_EMAIL ?? 'weller@pht.group';
  void sendScheduleEmail({
    to: salesEmail,
    ...buildSalesCustomRequestEmail({
      customerName: proposal.customer_name,
      customerEmail: proposal.customer_email,
      customRequest,
    }),
  });

  return sendHtml(res, 200, buildWishThankYouPage());
}
