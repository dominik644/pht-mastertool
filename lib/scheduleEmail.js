import { sendServerEmail, hasServerMailConfig } from './microsoftMailServer.js';
import { formatSlotGerman } from './scheduleSlots.js';

export function hasScheduleEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY) || hasServerMailConfig();
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
      text: text ?? html.replace(/<[^>]+>/g, ''),
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
 * @param {{ to: string, subject: string, html: string, text?: string }} params
 */
export async function sendScheduleEmail(params) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(params);
  }
  if (hasServerMailConfig()) {
    return sendServerEmail({
      to: params.to,
      subject: params.subject,
      body: params.text ?? params.html.replace(/<[^>]+>/g, ''),
    });
  }
  return { ok: false, skipped: true, error: 'Kein E-Mail-Versand konfiguriert (RESEND_API_KEY oder MS Graph)' };
}

/**
 * @param {{ customerName: string, customerEmail: string, slots: object[], baseUrl: string, proposalId: string, signToken: (slotId: string) => string | null }} ctx
 */
export function buildProposalEmail(ctx) {
  const { customerName, slots, baseUrl, signToken } = ctx;

  const slotLines = slots.map((slot) => {
    const token = signToken(slot.id);
    const url = `${baseUrl}/api/schedule-confirm?token=${encodeURIComponent(token ?? '')}`;
    const label = formatSlotGerman(slot);
    return { label, url };
  });

  const listHtml = slotLines
    .map(
      (s) =>
        `<li style="margin:12px 0"><a href="${s.url}" style="display:inline-block;padding:12px 20px;background:#1e6b4a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${s.label}</a></li>`,
    )
    .join('\n');

  const listText = slotLines.map((s) => `• ${s.label}: ${s.url}`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="de">
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Sehr geehrte Damen und Herren,</p>
  <p>gerne möchten wir einen persönlichen Besuch bei <strong>${customerName}</strong> vereinbaren, um über industrielle Wasch-, Hygiene- und Schleusen-Anlagen für Ihren Betrieb zu sprechen.</p>
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
