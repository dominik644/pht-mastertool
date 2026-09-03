import { sendServerEmail, hasServerMailConfig } from './microsoftMailServer.js';
import { formatSlotGerman } from './scheduleSlots.js';

export function hasScheduleEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY) || hasServerMailConfig();
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * @param {{ to: string, subject: string, text?: string, html: string, slotOptions?: { label: string, url: string }[] }} params
 */
export function buildMailtoFallback({ to, subject, text, html, slotOptions }) {
  let body = text ?? stripHtml(html);
  if (slotOptions?.length) {
    body = [
      'Bitte wählen Sie einen Termin (Link anklicken):',
      '',
      ...slotOptions.map((s, i) => `${i + 1}. ${s.label}\n${s.url}`),
      '',
      'Jeder Termin dauert ca. 45 Minuten. Die Links sind 14 Tage gültig.',
      '',
      'Mit freundlichen Grüßen',
      'PHT – Dominik Weller',
    ].join('\n');
  }
  const qs = new URLSearchParams();
  qs.set('subject', subject);
  qs.set('body', body);
  const mailto = `mailto:${to}?${qs.toString()}`;
  // Outlook and other clients often drop mailto bodies above ~1800 chars.
  if (mailto.length <= 1800) return mailto;
  const labelOnlyBody = [
    'Bitte wählen Sie einen Termin:',
    '',
    ...((slotOptions ?? []).map((s, i) => `${i + 1}. ${s.label}`)),
    '',
    'Die Bestätigungslinks finden Sie in der kopierten E-Mail-Vorschau in PHT.',
  ].join('\n');
  const fallbackQs = new URLSearchParams();
  fallbackQs.set('subject', subject);
  fallbackQs.set('body', labelOnlyBody);
  return `mailto:${to}?${fallbackQs.toString()}`;
}

function previewPayload(params) {
  const mailtoUrl = buildMailtoFallback(params);
  return {
    ok: true,
    preview: true,
    previewMode: params.previewMode ?? 'manual',
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? stripHtml(params.html),
    mailtoUrl,
    slotOptions: params.slotOptions,
  };
}

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} params
 */
async function sendViaResend({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const from = process.env.SCHEDULE_EMAIL_FROM || process.env.RESEND_FROM || 'PHT Terminplanung <termin@pht.group>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: text ?? stripHtml(html),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${err.slice(0, 160)}` };
  }
  return { ok: true };
}

/**
 * @param {{ to: string, subject: string, html: string, text?: string, slotOptions?: { label: string, url: string }[] }} params
 */
export async function sendScheduleEmail(params) {
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend(params);
    if (result.ok) return result;
    return previewPayload({ ...params, previewMode: 'resend-fallback' });
  }
  if (hasServerMailConfig()) {
    const result = await sendServerEmail({
      to: params.to,
      subject: params.subject,
      body: params.text ?? stripHtml(params.html),
      html: params.html,
    });
    if (result.ok) return result;
    return previewPayload({ ...params, previewMode: 'graph-fallback' });
  }

  console.log('\n[PHT Termin-E-Mail – Vorschau (kein RESEND_API_KEY)]');
  console.log('An:', params.to);
  console.log('Betreff:', params.subject);
  console.log('--- Text ---');
  console.log(params.text ?? stripHtml(params.html));
  console.log('--- mailto ---');
  console.log(buildMailtoFallback(params));
  console.log('');

  return previewPayload({ ...params, previewMode: 'console' });
}

/**
 * @param {{ customerName: string, customerEmail: string, slots: object[], baseUrl: string, proposalId: string, signToken: (slotId: string) => string | null }} ctx
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildProposalEmail(ctx) {
  const { customerName, slots, baseUrl, signToken } = ctx;
  const safeName = escapeHtml(customerName);
  const slotList = Array.isArray(slots) ? slots : [];

  const slotLines = slotList
    .map((slot) => {
      const token = signToken(slot.id);
      if (!token) return null;
      const url = `${baseUrl}/api/schedule-confirm?token=${encodeURIComponent(token)}`;
      const label = formatSlotGerman(slot);
      return { label, url };
    })
    .filter(Boolean);

  if (slotLines.length === 0) {
    throw new Error('Keine Terminvorschläge erzeugt – SCHEDULE_TOKEN_SECRET prüfen');
  }

  const listHtml = slotLines
    .map(
      (s) =>
        `<li style="margin:12px 0"><a href="${escapeHtml(s.url)}" style="display:inline-block;padding:12px 20px;background:#1e6b4a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(s.label)}</a></li>`,
    )
    .join('\n');

  const listText = slotLines.map((s) => `• ${s.label}: ${s.url}`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="de">
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Sehr geehrte Damen und Herren,</p>
  <p>gerne möchten wir einen persönlichen Besuch bei <strong>${safeName}</strong> vereinbaren, um über industrielle Wasch-, Hygiene- und Schleusen-Anlagen für Ihren Betrieb zu sprechen.</p>
  <p>Bitte wählen Sie einen der folgenden Terminvorschläge – mit einem Klick bestätigen Sie Ihren Wunschtermin:</p>
  <ul style="list-style:none;padding:0">${listHtml}</ul>
  <p>Jeder Termin dauert ca. 45 Minuten. Die Links sind 14 Tage gültig und können nur einmal verwendet werden.</p>
  <p>Mit freundlichen Grüßen<br><strong>PHT – Planungsbüro für Hygiene-Technik</strong><br>Dominik Weller</p>
</body>
</html>`;

  const text = `Sehr geehrte Damen und Herren,

gerne möchten wir einen persönlichen Besuch bei ${customerName} vereinbaren.

Bitte wählen Sie einen Termin:

${listText}

Jeder Termin dauert ca. 45 Minuten. Die Links sind 14 Tage gültig.

Mit freundlichen Grüßen
PHT – Dominik Weller`;

  return {
    subject: `PHT – Terminvorschläge für ${customerName}`,
    html,
    text,
    slotOptions: slotLines.map(({ label, url }) => ({ label, url })),
  };
}

/**
 * @param {{ customerName: string, slot: object }} ctx
 */
export function buildCustomerConfirmationEmail({ customerName, slot }) {
  const when = formatSlotGerman(slot);
  return {
    subject: `Termin bestätigt: ${when}`,
    html: `<p>Ihr Besuchstermin bei PHT ist bestätigt:</p><p><strong>${when}</strong></p><p>Wir freuen uns auf das Gespräch mit ${customerName}.</p><p>PHT – Dominik Weller</p>`,
    text: `Ihr Besuchstermin bei PHT ist bestätigt: ${when}. Wir freuen uns auf das Gespräch.`,
  };
}

/**
 * @param {{ salesEmail: string, customerName: string, slot: object, customerEmail: string }} ctx
 */
export function buildSalesNotificationEmail({ customerName, slot, customerEmail }) {
  const when = formatSlotGerman(slot);
  return {
    subject: `[PHT] Kunde hat Termin gewählt: ${customerName}`,
    html: `<p><strong>${customerName}</strong> (${customerEmail}) hat einen Besuchstermin bestätigt:</p><p><strong>${when}</strong></p>`,
    text: `${customerName} (${customerEmail}) hat Termin bestätigt: ${when}`,
  };
}
