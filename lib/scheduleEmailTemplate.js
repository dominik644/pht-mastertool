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
 * @param {{ customerName: string, introExtra?: string, slotCards: { label: string, url: string, weekday?: string }[], wishUrl?: string }} opts
 */
export function buildProposalEmailHtml({ customerName, introExtra = '', slotCards, wishUrl }) {
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
              ${wishUrl ? wishLinkHtml(wishUrl) : ''}
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
 * @param {{ customerName: string, introExtra?: string, slotCards: { label: string, url: string, weekday?: string }[], wishUrl?: string }} opts
 */
export function buildProposalEmailText({ customerName, introExtra = '', slotCards, wishUrl }) {
  const regionalBlock = introExtra ? `\n${stripTags(introExtra)}\n` : '';
  const slotBlock = slotCards.map((s, i) => `${i + 1}. ${s.weekday ? `${s.weekday}, ` : ''}${s.label}\n   ${s.url}`).join('\n\n');
  const wishBlock = wishUrl
    ? `\n\nKeiner passt? Eigenen Wunschtermin angeben:\n${wishUrl}\n`
    : '';

  return `Sehr geehrte Damen und Herren,

mein Name ist Dominik Weller von der PHT Group (https://pht.group).
Seit über 28 Jahren entwickeln wir ganzheitliche Hygienelösungen für die Lebensmittelindustrie –
von der Planung über die Montage bis zur Wartung.

Gerne würde ich ${customerName} persönlich besuchen, um vor Ort über Ihre Hygiene-Anlagen und Prozesse zu sprechen: Was funktioniert gut, wo gibt es Optimierungspotenzial, und wie können wir Sie bei Audit-Anforderungen unterstützen. Kein Verkaufsgespräch – sondern eine ehrliche fachliche Beratung aus der Praxis.
${regionalBlock}
Ihre Terminvorschläge
Klicken Sie auf Ihren Wunschtermin – die Buchung dauert nur einen Klick.

${slotBlock}
${wishBlock}

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

function wishLinkHtml(wishUrl) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
      <tr>
        <td style="padding:6px 0">
          <a href="${escapeHtml(wishUrl)}" style="display:block;text-decoration:none;background:${PHT_COLORS.card};border:1px dashed ${PHT_COLORS.accent};border-radius:12px;padding:16px 20px">
            <div style="font-size:14px;font-weight:600;color:${PHT_COLORS.accentLight}">Keiner passt? Eigenen Wunschtermin angeben</div>
            <div style="font-size:12px;color:${PHT_COLORS.dim};margin-top:6px">Datum und Uhrzeit nach Ihren Wünschen – wir melden uns zur Bestätigung.</div>
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Branded wish-appointment form page.
 * @param {{ customerName: string, token: string }} opts
 */
export function buildWishFormPage({ customerName, token }) {
  const safeName = escapeHtml(customerName);
  const action = `/api/schedule-wish?token=${encodeURIComponent(token)}`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Wunschtermin – PHT</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Inter, Arial, sans-serif; background: ${PHT_COLORS.bg}; color: ${PHT_COLORS.text}; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 520px; width: 100%; background: ${PHT_COLORS.card}; border: 1px solid ${PHT_COLORS.cardBorder}; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .header { padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid ${PHT_COLORS.cardBorder}; }
    .logo { display: inline-block; width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, ${PHT_COLORS.accent}, ${PHT_COLORS.accentDark}); color: #fff; font-weight: 700; font-size: 18px; line-height: 44px; text-align: center; margin-bottom: 12px; }
    .brand { font-size: 13px; font-weight: 600; color: ${PHT_COLORS.accentLight}; letter-spacing: 0.06em; text-transform: uppercase; }
    .content { padding: 28px 32px; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; color: #fff; font-weight: 600; }
    .subtitle { color: ${PHT_COLORS.muted}; font-size: 14px; line-height: 1.55; margin-bottom: 24px; }
    label { display: block; font-size: 12px; font-weight: 600; color: ${PHT_COLORS.muted}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    input, textarea, select { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid ${PHT_COLORS.cardBorder}; background: #0b1220; color: #fff; font-size: 15px; margin-bottom: 16px; }
    input:focus, textarea:focus { outline: none; border-color: ${PHT_COLORS.accent}; }
    input[readonly] { opacity: 0.75; cursor: default; }
    textarea { min-height: 88px; resize: vertical; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .row > div label { margin-top: 0; }
    .mode-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
    .mode-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid ${PHT_COLORS.cardBorder}; background: transparent; color: ${PHT_COLORS.muted}; font-size: 13px; cursor: pointer; }
    .mode-btn.active { border-color: ${PHT_COLORS.accent}; color: ${PHT_COLORS.accentLight}; background: ${PHT_COLORS.accent}18; }
    .range-fields { display: none; }
    .range-fields.visible { display: block; }
    button[type=submit] { width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, ${PHT_COLORS.accent}, ${PHT_COLORS.accentDark}); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    button[type=submit]:hover { opacity: 0.95; }
    .footer { padding: 20px 32px; border-top: 1px solid ${PHT_COLORS.cardBorder}; text-align: center; font-size: 11px; color: ${PHT_COLORS.dim}; }
    .footer a { color: ${PHT_COLORS.accentLight}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">P</div>
      <div class="brand">PHT Group</div>
    </div>
    <div class="content">
      <h1>Eigenen Wunschtermin angeben</h1>
      <p class="subtitle">Keiner der vorgeschlagenen Termine passt? Teilen Sie uns Ihren Wunsch mit – wir melden uns zur Bestätigung.</p>
      <form id="wishForm">
        <label for="customerName">Ihr Unternehmen</label>
        <input id="customerName" name="customerName" type="text" value="${safeName}" readonly />

        <div class="mode-toggle">
          <button type="button" class="mode-btn active" id="modeSingle" onclick="setMode('single')">Einzeltermin</button>
          <button type="button" class="mode-btn" id="modeRange" onclick="setMode('range')">Zeitraum</button>
        </div>

        <label for="dateFrom">Datum</label>
        <input id="dateFrom" name="dateFrom" type="date" required />

        <div class="range-fields" id="rangeFields">
          <label for="dateTo">Bis (optional)</label>
          <input id="dateTo" name="dateTo" type="date" />
        </div>

        <div class="row">
          <div>
            <label for="timeFrom">Von</label>
            <input id="timeFrom" name="timeFrom" type="time" required />
          </div>
          <div>
            <label for="timeTo">Bis (optional)</label>
            <input id="timeTo" name="timeTo" type="time" />
          </div>
        </div>

        <label for="message">Nachricht an PHT (optional)</label>
        <textarea id="message" name="message" placeholder="z. B. bevorzugter Ansprechpartner, Hinweise zum Zugang …"></textarea>

        <button type="submit">Wunschtermin übermitteln</button>
      </form>
    </div>
    <div class="footer">
      <a href="https://pht.group">pht.group</a> · Planungsbüro für Hygiene-Technik
    </div>
  </div>
  <script>
    function setMode(mode) {
      document.getElementById('modeSingle').classList.toggle('active', mode === 'single');
      document.getElementById('modeRange').classList.toggle('active', mode === 'range');
      document.getElementById('rangeFields').classList.toggle('visible', mode === 'range');
      if (mode === 'single') document.getElementById('dateTo').value = '';
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('dateFrom').min = tomorrow.toISOString().slice(0, 10);
    document.getElementById('dateTo').min = tomorrow.toISOString().slice(0, 10);
    document.getElementById('wishForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Wird übermittelt…';
      const payload = {
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value || null,
        timeFrom: document.getElementById('timeFrom').value,
        timeTo: document.getElementById('timeTo').value || null,
        message: document.getElementById('message').value || '',
      };
      try {
        const res = await fetch('${action}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          document.open();
          document.write(await res.text());
          document.close();
        } else {
          btn.disabled = false;
          btn.textContent = 'Wunschtermin übermitteln';
          alert('Übermittlung fehlgeschlagen. Bitte erneut versuchen.');
        }
      } catch {
        btn.disabled = false;
        btn.textContent = 'Wunschtermin übermitteln';
        alert('Verbindungsfehler. Bitte erneut versuchen.');
      }
    });
  </script>
</body>
</html>`;
}

/** Thank-you page after wish submission. */
export function buildWishThankYouPage() {
  return buildBrandedPage({
    title: 'Wunschtermin übermittelt',
    bodyHtml: '<p>Ihr Wunschtermin wurde übermittelt. Wir melden uns zur Bestätigung.</p><p style="margin-top:16px;font-size:13px">Bei Rückfragen erreichen Sie uns unter <a href="mailto:weller@pht.group" style="color:#60a5fa">weller@pht.group</a>.</p>',
    variant: 'success',
  });
}

/** German weekday label from YYYY-MM-DD */
export function weekdayLabelGerman(dateStr) {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const d = new Date(`${dateStr}T12:00:00`);
  return days[d.getDay()] ?? '';
}
