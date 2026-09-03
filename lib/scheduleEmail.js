import { sendServerEmail, hasServerMailConfig } from './microsoftMailServer.js';
import { formatSlotGerman } from './scheduleSlots.js';
import {
  buildProposalEmailHtml,
  buildProposalEmailText,
  escapeHtml,
  weekdayLabelGerman,
} from './scheduleEmailTemplate.js';
import { buildMailtoUrl, buildEmlContent } from './scheduleEmailMime.js';

export function hasScheduleEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY) || hasServerMailConfig();
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Plain-text body for mailto / clipboard with full confirmation URLs (one per slot).
 * @param {{ text?: string, html: string, slotOptions?: { label: string, url: string }[] }} params
 */
export function buildMailtoBody({ text, html, slotOptions }) {
  if (slotOptions?.length) {
    return [
      'Klicken Sie auf Ihren Wunschtermin – die Buchung dauert nur einen Klick.',
      '',
      ...slotOptions.map((s, i) => `${i + 1}. ${s.label}\n${s.url}`),
      '',
      'Jeder Termin dauert ca. 45 Minuten. Die Links sind 14 Tage gültig.',
      '',
      'Mit freundlichen Grüßen',
      'Dominik Weller · PHT Group · https://pht.group',
    ].join('\n');
  }
  return text ?? stripHtml(html);
}

/**
 * @param {{ to: string, subject: string, text?: string, html: string, slotOptions?: { label: string, url: string }[] }} params
 */
export function buildMailtoFallback({ to, subject, text, html, slotOptions }) {
  const body = buildMailtoBody({ text, html, slotOptions });
  return buildMailtoUrl({ to, subject, body });
}

export { buildEmlContent };

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

  const from = process.env.SCHEDULE_EMAIL_FROM || process.env.RESEND_FROM || 'Dominik Weller · PHT <termin@pht.group>';

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
 * @param {{ date: string, dateLabel?: string, nearbyNames?: string[] }[]} regionalDays
 * @param {{ date: string }[]} slotList
 */
function buildRegionalNote(regionalDays, slotList) {
  if (!regionalDays?.length || !slotList?.length) return '';
  const slotDates = new Set(slotList.map((s) => s.date));
  const matching = regionalDays.filter((d) => slotDates.has(d.date) && d.nearbyNames?.length);
  if (!matching.length) return '';
  const first = matching[0];
  const label = first.dateLabel || first.date;
  return `Ich bin in Ihrer Region am ${label} – gerne kombinieren wir den Termin mit weiteren Besuchen in der Nähe.`;
}

export function buildProposalEmail(ctx) {
  const { customerName, slots, baseUrl, signToken, regionalDays = [] } = ctx;
  const slotList = Array.isArray(slots) ? slots : [];

  const slotCards = slotList
    .map((slot) => {
      const token = signToken(slot.id);
      if (!token) return null;
      const url = `${baseUrl}/api/schedule-confirm?token=${encodeURIComponent(token)}`;
      const label = formatSlotGerman(slot);
      const weekday = weekdayLabelGerman(slot.date);
      return { label, url, weekday };
    })
    .filter(Boolean);

  if (slotCards.length === 0) {
    throw new Error('Keine Terminvorschläge erzeugt – SCHEDULE_TOKEN_SECRET prüfen');
  }

  const regionalNote = buildRegionalNote(regionalDays, slotList);
  const introExtra = regionalNote
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#1a2234;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;color:#94a3b8;font-size:14px">${escapeHtml(regionalNote)}</p>`
    : '';

  const html = buildProposalEmailHtml({ customerName, introExtra, slotCards });
  const text = buildProposalEmailText({ customerName, introExtra: regionalNote ? `\n${regionalNote}\n` : '', slotCards });

  return {
    subject: `Persönlicher Besuch bei ${customerName} – Terminvorschläge von PHT`,
    html,
    text,
    slotOptions: slotCards.map(({ label, url, weekday }) => ({ label: weekday ? `${weekday}, ${label}` : label, url })),
  };
}

/**
 * @param {{ customerName: string, slot: object }} ctx
 */
export function buildCustomerConfirmationEmail({ customerName, slot }) {
  const when = formatSlotGerman(slot);
  const weekday = weekdayLabelGerman(slot.date);
  return {
    subject: `Termin bestätigt: ${when} – PHT`,
    html: `<p>Ihr Besuchstermin bei PHT ist bestätigt:</p><p><strong>${weekday}, ${when}</strong></p><p>Wir freuen uns auf das Gespräch mit ${escapeHtml(customerName)}.</p><p><a href="https://pht.group">pht.group</a></p><p>Dominik Weller · PHT Group</p>`,
    text: `Ihr Besuchstermin bei PHT ist bestätigt: ${weekday}, ${when}. Wir freuen uns auf das Gespräch.\n\nDominik Weller · PHT Group · https://pht.group`,
  };
}

/**
 * @param {{ salesEmail: string, customerName: string, slot: object, customerEmail: string }} ctx
 */
export function buildSalesNotificationEmail({ customerName, slot, customerEmail }) {
  const when = formatSlotGerman(slot);
  return {
    subject: `[PHT] Kunde hat Termin gewählt: ${customerName}`,
    html: `<p><strong>${escapeHtml(customerName)}</strong> (${escapeHtml(customerEmail)}) hat einen Besuchstermin bestätigt:</p><p><strong>${escapeHtml(when)}</strong></p>`,
    text: `${customerName} (${customerEmail}) hat Termin bestätigt: ${when}`,
  };
}
