import { sendServerEmail, hasServerMailConfig } from './microsoftMailServer.js';
import { formatSlotGerman } from './scheduleSlots.js';
import {
  buildProposalEmailHtml,
  buildProposalEmailText,
  escapeHtml,
  weekdayLabelGerman,
  PHT_COLORS,
} from './scheduleEmailTemplate.js';
import { formatDateGerman } from './scheduleSlots.js';
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
export function buildMailtoBody({ text, html, slotOptions, wishUrl }) {
  if (slotOptions?.length) {
    const bookingSlots = slotOptions.filter((s) => !/Wunschtermin/i.test(s.label));
    const wishSlot = slotOptions.find((s) => /Wunschtermin/i.test(s.label));
    const wishLine = wishUrl || wishSlot
      ? ['', 'Keiner passt? Eigenen Wunschtermin angeben:', wishUrl ?? wishSlot?.url ?? '']
      : [];
    return [
      'Guten Tag,',
      '',
      'gerne möchte ich Sie persönlich besuchen. Bitte wählen Sie einen der folgenden Termine – die Buchung dauert nur einen Klick:',
      '',
      ...bookingSlots.flatMap((s, i) => [`${i + 1}. ${s.label}`, s.url, '']),
      ...wishLine,
      '',
      'Jeder Termin dauert ca. 45 Minuten. Die Links sind 14 Tage gültig.',
      '',
      'Mit freundlichen Grüßen',
      'Dominik Weller · PHT Group · https://pht.group',
    ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return text ?? stripHtml(html);
}

/**
 * @param {{ to: string, subject: string, text?: string, html: string, slotOptions?: { label: string, url: string }[] }} params
 */
export function buildMailtoFallback({ to, subject, text, html, slotOptions, wishUrl }) {
  const body = buildMailtoBody({ text, html, slotOptions, wishUrl });
  return buildMailtoUrl({ to, subject, body });
}

export { buildEmlContent };

function previewPayload(params) {
  const mailtoBody = buildMailtoBody(params);
  const mailtoUrl = buildMailtoUrl({ to: params.to, subject: params.subject, body: mailtoBody });
  return {
    ok: true,
    preview: true,
    previewMode: params.previewMode ?? 'manual',
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? stripHtml(params.html),
    mailtoBody,
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
  const { customerName, slots, baseUrl, signToken, signWishToken, regionalDays = [] } = ctx;
  const slotList = Array.isArray(slots) ? slots : [];

  const slotCards = slotList
    .map((slot) => {
      const token = signToken(slot.id);
      if (!token) return null;
      const url = `${baseUrl}/api/schedule-confirm?token=${encodeURIComponent(token)}`;
      const weekday = weekdayLabelGerman(slot.date);
      const dateLabel = formatDateGerman(slot.date);
      const time = slot.startTime;
      const compactLabel = `${weekday} · ${dateLabel} · ${time}`;
      return { label: compactLabel, compactLabel, url, weekday, dateLabel, time };
    })
    .filter(Boolean);

  if (slotCards.length === 0) {
    throw new Error('Keine Terminvorschläge erzeugt – SCHEDULE_TOKEN_SECRET prüfen');
  }

  let wishUrl = null;
  if (signWishToken) {
    const wishToken = signWishToken();
    if (wishToken) {
      wishUrl = `${baseUrl}/book/wish?token=${encodeURIComponent(wishToken)}`;
    }
  }

  const regionalNote = buildRegionalNote(regionalDays, slotList);
  const introExtra = regionalNote
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:${PHT_COLORS.cardMuted};border-left:4px solid ${PHT_COLORS.accent};border-radius:0 8px 8px 0;color:${PHT_COLORS.muted};font-size:14px">${escapeHtml(regionalNote)}</p>`
    : '';

  const html = buildProposalEmailHtml({ customerName, introExtra, slotCards, wishUrl });
  const text = buildProposalEmailText({
    customerName,
    introExtra: regionalNote ? `\n${regionalNote}\n` : '',
    slotCards,
    wishUrl,
  });

  const slotOptions = slotCards.map(({ compactLabel, label, url }) => ({ label: compactLabel ?? label, url }));
  if (wishUrl) {
    slotOptions.push({ label: 'Keiner passt? Eigenen Wunschtermin angeben', url: wishUrl });
  }

  return {
    subject: `Persönlicher Besuch bei ${customerName} – Terminvorschläge von PHT`,
    html,
    text,
    slotOptions,
    wishUrl,
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
 * @param {{ customerName: string, customerEmail: string, customRequest: object }} ctx
 */
export function buildSalesCustomRequestEmail({ customerName, customerEmail, customRequest }) {
  const cr = customRequest;
  const datePart = cr.dateTo && cr.dateTo !== cr.dateFrom
    ? `${cr.dateFrom} – ${cr.dateTo}`
    : cr.dateFrom;
  const timePart = cr.timeTo ? `${cr.timeFrom}–${cr.timeTo}` : cr.timeFrom;
  const when = `${datePart}, ${timePart} Uhr`;
  const msgBlock = cr.message
    ? `<p style="margin-top:12px"><strong>Nachricht:</strong> ${escapeHtml(cr.message)}</p>`
    : '';

  return {
    subject: `[PHT] Wunschtermin: ${customerName}`,
    html: `<p><strong>${escapeHtml(customerName)}</strong> (${escapeHtml(customerEmail)}) hat einen Wunschtermin übermittelt:</p><p><strong>${escapeHtml(when)}</strong></p>${msgBlock}<p style="margin-top:16px;font-size:13px;color:#64748b">Bitte in PHT Vertrieb Ost bestätigen.</p>`,
    text: `${customerName} (${customerEmail}) – Wunschtermin: ${when}${cr.message ? `\nNachricht: ${cr.message}` : ''}`,
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
