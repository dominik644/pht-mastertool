/** Shared PHT-branded HTML for schedule emails and confirmation pages. */

export const PHT_COLORS = {
  bg: '#0b0f1a',
  card: '#111827',
  cardBorder: '#1a2234',
  text: '#e2e8f0',
  muted: '#94a3b8',
  dim: '#64748b',
  accent: '#3b82f6',
  accentDark: '#2563eb',
  accentLight: '#60a5fa',
  success: '#10b981',
  successDark: '#059669',
  error: '#ef4444',
};

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function phtHeader() {
  return `
    <tr>
      <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid ${PHT_COLORS.cardBorder}">
        <div style="display:inline-block;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${PHT_COLORS.accent},${PHT_COLORS.accentDark});color:#fff;font-weight:700;font-size:18px;line-height:44px;text-align:center;margin-bottom:12px">P</div>
        <div style="font-size:13px;font-weight:600;color:${PHT_COLORS.accentLight};letter-spacing:0.06em;text-transform:uppercase">PHT Group</div>
        <div style="font-size:11px;color:${PHT_COLORS.dim};margin-top:4px">Planungsbüro für Hygiene-Technik</div>
      </td>
    </tr>`;
}

function phtFooter() {
  return `
    <tr>
      <td style="padding:24px 32px 32px;border-top:1px solid ${PHT_COLORS.cardBorder};text-align:center">
        <p style="margin:0 0 8px;font-size:13px;color:${PHT_COLORS.muted}">
          <a href="https://pht.group" style="color:${PHT_COLORS.accentLight};text-decoration:none;font-weight:600">pht.group</a>
          &nbsp;·&nbsp; Hygienelösungen für die Lebensmittelindustrie
        </p>
        <p style="margin:0;font-size:11px;color:${PHT_COLORS.dim};line-height:1.5">
          PHT Deutschland · Bad Tölz &amp; Beckum<br/>
          <a href="https://pht.group/impressum" style="color:${PHT_COLORS.dim};text-decoration:underline">Impressum</a>
        </p>
      </td>
    </tr>`;
}

/**
 * @param {{ title: string, bodyHtml: string, variant?: 'default' | 'success' | 'error' }} opts
 */
export function buildBrandedPage({ title, bodyHtml, variant = 'default' }) {
  const accent = variant === 'error' ? PHT_COLORS.error : variant === 'success' ? PHT_COLORS.success : PHT_COLORS.accent;
  const icon = variant === 'error' ? '✕' : variant === 'success' ? '✓' : 'P';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:'Segoe UI',Inter,Arial,sans-serif;background:${PHT_COLORS.bg};color:${PHT_COLORS.text};margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="max-width:520px;width:100%;background:${PHT_COLORS.card};border:1px solid ${PHT_COLORS.cardBorder};border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4)">
    <div style="padding:32px;text-align:center">
      <div style="width:52px;height:52px;border-radius:50%;background:${accent}22;border:2px solid ${accent};margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:22px;color:${accent};font-weight:700">${icon}</div>
      <h1 style="font-size:1.35rem;margin:0 0 14px;color:#fff;font-weight:600">${escapeHtml(title)}</h1>
      <div style="color:${PHT_COLORS.muted};line-height:1.65;font-size:15px">${bodyHtml}</div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid ${PHT_COLORS.cardBorder};text-align:center">
      <a href="https://pht.group" style="color:${PHT_COLORS.accentLight};text-decoration:none;font-size:13px;font-weight:600">pht.group</a>
      <p style="margin:8px 0 0;font-size:11px;color:${PHT_COLORS.dim}">PHT – Planungsbüro für Hygiene-Technik</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * @param {{ label: string, url: string, weekday?: string }[]} slotCards
 */
function slotCardsHtml(slotCards) {
  return slotCards
    .map(
      (s) => `
        <tr>
          <td style="padding:6px 0">
            <a href="${escapeHtml(s.url)}" style="display:block;text-decoration:none;background:${PHT_COLORS.card};border:1px solid ${PHT_COLORS.cardBorder};border-radius:12px;padding:16px 20px;transition:background 0.15s">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${s.weekday ? `<div style="font-size:11px;color:${PHT_COLORS.accentLight};font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">${escapeHtml(s.weekday)}</div>` : ''}
                    <div style="font-size:16px;font-weight:600;color:#fff">${escapeHtml(s.label)}</div>
                    <div style="font-size:12px;color:${PHT_COLORS.dim};margin-top:4px">45 Min. · Besuch vor Ort</div>
                  </td>
                  <td width="36" style="text-align:right;vertical-align:middle">
                    <div style="width:32px;height:32px;border-radius:8px;background:${PHT_COLORS.successDark};color:#fff;font-size:18px;line-height:32px;text-align:center">→</div>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>`,
    )
    .join('\n');
}

/**
 * @param {{ customerName: string, introExtra?: string, slotCards: { label: string, url: string, weekday?: string }[] }} opts
 */
export function buildProposalEmailHtml({ customerName, introExtra = '', slotCards }) {
  const safeName = escapeHtml(customerName);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Terminvorschläge – PHT</title>
</head>
<body style="margin:0;padding:0;background:${PHT_COLORS.bg};font-family:'Segoe UI',Inter,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PHT_COLORS.bg};padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PHT_COLORS.card};border:1px solid ${PHT_COLORS.cardBorder};border-radius:16px;overflow:hidden">
          ${phtHeader()}
          <tr>
            <td style="padding:28px 32px;color:${PHT_COLORS.text};line-height:1.65;font-size:15px">
              <p style="margin:0 0 16px;color:#fff;font-size:16px">Sehr geehrte Damen und Herren,</p>
              <p style="margin:0 0 16px;color:${PHT_COLORS.muted}">
                mein Name ist <strong style="color:#fff">Dominik Weller</strong> von der
                <a href="https://pht.group" style="color:${PHT_COLORS.accentLight};text-decoration:none;font-weight:600">PHT Group</a>.
                Seit über 28 Jahren entwickeln wir ganzheitliche Hygienelösungen für die Lebensmittelindustrie –
                von der Planung über die Montage bis zur Wartung.
              </p>
              <p style="margin:0 0 16px;color:${PHT_COLORS.muted}">
                Gerne würde ich <strong style="color:#fff">${safeName}</strong> persönlich besuchen, um
                vor Ort über Ihre Hygiene-Anlagen und Prozesse zu sprechen: Was funktioniert gut,
                wo gibt es Optimierungspotenzial, und wie können wir Sie bei Audit-Anforderungen unterstützen.
                Kein Verkaufsgespräch – sondern eine ehrliche fachliche Beratung aus der Praxis.
              </p>
              ${introExtra}
              <p style="margin:20px 0 12px;color:#fff;font-weight:600;font-size:15px">Ihre Terminvorschläge</p>
              <p style="margin:0 0 16px;color:${PHT_COLORS.dim};font-size:13px">
                Klicken Sie auf Ihren Wunschtermin – die Buchung dauert nur einen Klick.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${slotCardsHtml(slotCards)}
              </table>
              <p style="margin:20px 0 0;color:${PHT_COLORS.dim};font-size:12px;line-height:1.5">
                Jeder Termin dauert ca. 45 Minuten und findet bei Ihnen vor Ort statt.
                Die Links sind 14 Tage gültig und können nur einmal verwendet werden.
              </p>
              <p style="margin:24px 0 0;color:${PHT_COLORS.muted}">
                Mit freundlichen Grüßen<br/>
                <strong style="color:#fff">Dominik Weller</strong><br/>
                <span style="font-size:13px;color:${PHT_COLORS.dim}">PHT – Planungsbüro für Hygiene-Technik</span>
              </p>
            </td>
          </tr>
          ${phtFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * @param {{ customerName: string, introExtra?: string, slotCards: { label: string, url: string, weekday?: string }[] }} opts
 */
export function buildProposalEmailText({ customerName, introExtra = '', slotCards }) {
  const regionalBlock = introExtra ? `\n${stripTags(introExtra)}\n` : '';
  const slotBlock = slotCards.map((s, i) => `${i + 1}. ${s.weekday ? `${s.weekday}, ` : ''}${s.label}\n   ${s.url}`).join('\n\n');

  return `Sehr geehrte Damen und Herren,

mein Name ist Dominik Weller von der PHT Group (https://pht.group).
Seit über 28 Jahren entwickeln wir ganzheitliche Hygienelösungen für die Lebensmittelindustrie –
von der Planung über die Montage bis zur Wartung.

Gerne würde ich ${customerName} persönlich besuchen, um vor Ort über Ihre Hygiene-Anlagen und Prozesse zu sprechen: Was funktioniert gut, wo gibt es Optimierungspotenzial, und wie können wir Sie bei Audit-Anforderungen unterstützen. Kein Verkaufsgespräch – sondern eine ehrliche fachliche Beratung aus der Praxis.
${regionalBlock}
Ihre Terminvorschläge
Klicken Sie auf Ihren Wunschtermin – die Buchung dauert nur einen Klick.

${slotBlock}

Jeder Termin dauert ca. 45 Minuten und findet bei Ihnen vor Ort statt.
Die Links sind 14 Tage gültig und können nur einmal verwendet werden.

Mit freundlichen Grüßen
Dominik Weller
PHT – Planungsbüro für Hygiene-Technik
https://pht.group`;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** German weekday label from YYYY-MM-DD */
export function weekdayLabelGerman(dateStr) {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const d = new Date(`${dateStr}T12:00:00`);
  return days[d.getDay()] ?? '';
}
