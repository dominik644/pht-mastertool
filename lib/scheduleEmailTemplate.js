/** Shared PHT-branded HTML for schedule emails and confirmation pages (pht.group palette). */

/** Outer card width for proposal emails and matching web previews (Outlook-friendly). */
export const PHT_EMAIL_MAX_WIDTH = 960;

export const PHT_COLORS = {
  bg: '#f1f3f5',
  card: '#ffffff',
  cardBorder: '#dde3ea',
  cardMuted: '#eef1f4',
  text: '#1a1a1a',
  muted: '#54595f',
  dim: '#666666',
  navy: '#17417d',
  navyDark: '#123560',
  accent: '#dc0a2e',
  accentDark: '#b00824',
  accentLight: '#ee0d08',
  link: '#17417d',
  success: '#17417d',
  successDark: '#123560',
  error: '#dc0a2e',
  white: '#ffffff',
};

/** Hosted assets from pht.group (absolute URLs for email clients). */
export const PHT_LOGO_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_4C.webp';
export const PHT_LOGO_WHITE_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_weiss.webp';
export const PHT_HERO_BG_URL = 'https://pht.group/wp-content/uploads/2026/06/header-kontak-2.webp';
export const PHT_PATTERN_URL = 'https://pht.group/wp-content/uploads/2026/05/Raster.webp';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline SVG network/node pattern (web pages + email fallback layer). */
function networkPatternDataUri({ stroke = '#ffffff', opacity = 0.22, width = 480, height = 280 } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <g fill="none" stroke="${stroke}" stroke-width="0.6" opacity="${opacity}">
      <line x1="320" y1="40" x2="380" y2="90"/><line x1="380" y1="90" x2="420" y2="60"/>
      <line x1="380" y1="90" x2="350" y2="140"/><line x1="350" y1="140" x2="290" y2="120"/>
      <line x1="350" y1="140" x2="400" y2="180"/><line x1="400" y1="180" x2="440" y2="150"/>
      <line x1="400" y1="180" x2="370" y2="230"/><line x1="290" y1="120" x2="240" y2="170"/>
      <line x1="240" y1="170" x2="300" y2="210"/><line x1="300" y1="210" x2="370" y2="230"/>
      <line x1="420" y1="60" x2="460" y2="100"/><line x1="460" y1="100" x2="440" y2="150"/>
    </g>
    <g fill="${stroke}" opacity="${Math.min(opacity + 0.15, 0.55)}">
      <circle cx="320" cy="40" r="2.5"/><circle cx="380" cy="90" r="3"/><circle cx="420" cy="60" r="2"/>
      <circle cx="350" cy="140" r="2.5"/><circle cx="290" cy="120" r="2"/><circle cx="400" cy="180" r="3"/>
      <circle cx="440" cy="150" r="2"/><circle cx="370" cy="230" r="2.5"/><circle cx="240" cy="170" r="2"/>
      <circle cx="300" cy="210" r="2"/><circle cx="460" cy="100" r="2.5"/>
      <circle cx="400" cy="90" r="4" fill="${stroke}" opacity="${Math.min(opacity + 0.35, 0.75)}"/>
    </g>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Faint dot/grid pattern for light content backgrounds. */
function lightPatternDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <g fill="#17417d" opacity="0.04">
      <circle cx="10" cy="10" r="1.2"/><circle cx="40" cy="10" r="1.2"/><circle cx="70" cy="10" r="1.2"/>
      <circle cx="10" cy="40" r="1.2"/><circle cx="40" cy="40" r="1.2"/><circle cx="70" cy="40" r="1.2"/>
      <circle cx="10" cy="70" r="1.2"/><circle cx="40" cy="70" r="1.2"/><circle cx="70" cy="70" r="1.2"/>
    </g>
    <g stroke="#17417d" stroke-width="0.4" opacity="0.03">
      <line x1="10" y1="10" x2="40" y2="40"/><line x1="40" y1="10" x2="70" y2="40"/>
      <line x1="10" y1="40" x2="40" y2="70"/><line x1="40" y1="40" x2="70" y2="70"/>
    </g>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function emailHeroBackgroundStyle() {
  const network = networkPatternDataUri({ stroke: '#a8d4f0', opacity: 0.35 });
  return [
    `background-color:${PHT_COLORS.navy}`,
    `background-image:${network},url('${PHT_HERO_BG_URL}')`,
    'background-size:55% auto, cover',
    'background-position:right center, center',
    'background-repeat:no-repeat,no-repeat',
  ].join(';');
}

function emailContentBackgroundStyle() {
  const dots = lightPatternDataUri();
  return [
    `background-color:${PHT_COLORS.bg}`,
    `background-image:${dots},url('${PHT_PATTERN_URL}')`,
    'background-size:120px 120px, cover',
    'background-position:top left, center',
    'background-repeat:repeat,no-repeat',
    'background-blend-mode:normal,soft-light',
  ].join(';');
}

function webHeroBackgroundStyle() {
  const network = networkPatternDataUri({ stroke: '#cce8ff', opacity: 0.4 });
  return [
    `background-color:${PHT_COLORS.navy}`,
    `background-image:${network},url('${PHT_HERO_BG_URL}')`,
    'background-size:50% auto, cover',
    'background-position:right center, center',
    'background-repeat:no-repeat,no-repeat',
  ].join(';');
}

function webContentBackgroundStyle() {
  const dots = lightPatternDataUri();
  return [
    `background-color:${PHT_COLORS.bg}`,
    `background-image:${dots},url('${PHT_PATTERN_URL}')`,
    'background-size:120px 120px, cover',
    'background-position:top left, center',
    'background-repeat:repeat,no-repeat',
    'background-blend-mode:normal,soft-light',
  ].join(';');
}

function phtLogoImg({ white = false, width = 140, alt = 'PHT Group' } = {}) {
  const src = white ? PHT_LOGO_WHITE_URL : PHT_LOGO_URL;
  const h = white ? Math.round(width * 0.337) : Math.round(width * 0.334);
  return `<a href="https://pht.group" style="text-decoration:none;display:inline-block">
    <img src="${src}" width="${width}" height="${h}" alt="${escapeHtml(alt)}" style="display:block;border:0;max-width:100%;height:auto"/>
  </a>`;
}

function phtWhiteHeaderBar() {
  return `
    <tr>
      <td style="padding:14px 28px;background:${PHT_COLORS.white};border-bottom:1px solid ${PHT_COLORS.cardBorder};text-align:left">
        ${phtLogoImg({ width: 120 })}
      </td>
    </tr>`;
}

function phtHeroBanner(tagline = 'Wir sind für Sie da.') {
  return `
    <tr>
      <td style="padding:0;${emailHeroBackgroundStyle()}">
        <div style="padding:32px 28px 28px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase">Terminvorschlag</p>
          <p style="margin:0;font-size:22px;font-weight:300;color:${PHT_COLORS.white};line-height:1.35;letter-spacing:0.01em">${escapeHtml(tagline)}</p>
        </div>
      </td>
    </tr>`;
}

function phtSectionHeading(label, title) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 14px">
      <tr>
        <td style="width:4px;background:${PHT_COLORS.accent};border-radius:2px;padding:0;font-size:0;line-height:0">&nbsp;</td>
        <td style="padding-left:14px;vertical-align:middle">
          <div style="font-size:10px;font-weight:700;color:${PHT_COLORS.accent};text-transform:uppercase;letter-spacing:0.14em;margin-bottom:4px">${escapeHtml(label)}</div>
          <div style="font-size:17px;font-weight:600;color:${PHT_COLORS.text};line-height:1.3">${escapeHtml(title)}</div>
        </td>
      </tr>
    </table>`;
}

function phtFooter() {
  return `
    <tr>
      <td style="padding:24px 28px 28px;border-top:1px solid ${PHT_COLORS.cardBorder};background:${PHT_COLORS.cardMuted};text-align:center">
        ${phtLogoImg({ width: 100 })}
        <p style="margin:12px 0 8px;font-size:13px;color:${PHT_COLORS.muted};line-height:1.5">
          <strong style="color:${PHT_COLORS.text}">Ihr Partner für Hygiene und Technologie</strong><br/>
          Ganzheitliche Hygienelösungen für die Lebensmittelbranche. Sicher aus Erfahrung.
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:${PHT_COLORS.muted}">
          <a href="https://pht.group" style="color:${PHT_COLORS.navy};text-decoration:none;font-weight:600">pht.group</a>
        </p>
        <p style="margin:0;font-size:11px;color:${PHT_COLORS.dim};line-height:1.5">
          PHT Deutschland · Bad Tölz &amp; Beckum<br/>
          <a href="https://pht.group/impressum" style="color:${PHT_COLORS.dim};text-decoration:underline">Impressum</a>
        </p>
      </td>
    </tr>`;
}

function linkStyle() {
  return `color:${PHT_COLORS.navy};text-decoration:none;font-weight:600`;
}

/**
 * @param {{ title: string, bodyHtml: string, variant?: 'default' | 'success' | 'error', heroTagline?: string }} opts
 */
export function buildBrandedPage({ title, bodyHtml, variant = 'default', heroTagline }) {
  const accent = variant === 'error' ? PHT_COLORS.error : PHT_COLORS.navy;
  const icon = variant === 'error' ? '✕' : variant === 'success' ? '✓' : '●';
  const tagline = heroTagline ?? (variant === 'success' ? 'Termin bestätigt.' : variant === 'error' ? 'Hinweis' : 'Wir sind für Sie da.');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:'Segoe UI',Inter,Arial,sans-serif;background:${PHT_COLORS.bg};color:${PHT_COLORS.text};margin:0;min-height:100vh;padding:24px 12px">
  <div style="max-width:${PHT_EMAIL_MAX_WIDTH}px;width:100%;margin:0 auto;background:${PHT_COLORS.card};border:1px solid ${PHT_COLORS.cardBorder};border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(23,65,125,0.08)">
    <div style="padding:14px 28px;background:${PHT_COLORS.white};border-bottom:1px solid ${PHT_COLORS.cardBorder}">
      ${phtLogoImg({ width: 120 })}
    </div>
    <div style="${webHeroBackgroundStyle()};padding:28px 28px 24px">
      <p style="margin:0;font-size:22px;font-weight:300;color:${PHT_COLORS.white};line-height:1.35">${escapeHtml(tagline)}</p>
    </div>
    <div style="padding:32px 28px;${webContentBackgroundStyle()};text-align:center">
      <div style="width:52px;height:52px;border-radius:50%;background:${accent}15;border:2px solid ${accent};margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:22px;color:${accent};font-weight:700">${icon}</div>
      <h1 style="font-size:1.35rem;margin:0 0 14px;color:${PHT_COLORS.text};font-weight:300">${escapeHtml(title)}</h1>
      <div style="color:${PHT_COLORS.muted};line-height:1.65;font-size:15px;text-align:left">${bodyHtml}</div>
    </div>
    <div style="padding:20px 28px;border-top:1px solid ${PHT_COLORS.cardBorder};background:${PHT_COLORS.cardMuted};text-align:center">
      ${phtLogoImg({ width: 90 })}
      <p style="margin:10px 0 0;font-size:11px;color:${PHT_COLORS.dim}">PHT – Hygienelösungen für die Lebensmittelindustrie · <a href="https://pht.group" style="${linkStyle()};font-size:11px">pht.group</a></p>
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
      (s, i) => {
        const line = s.compactLabel
          || [s.weekday, s.dateLabel, s.time].filter(Boolean).join(' · ')
          || s.label;
        return `
        <tr>
          <td style="padding:${i === 0 ? '0' : '10px'} 0 0">
            <a href="${escapeHtml(s.url)}" style="display:block;text-decoration:none;background:${PHT_COLORS.white};border:2px solid ${PHT_COLORS.navy};border-radius:8px;padding:14px 20px;text-align:center">
              <span style="font-size:15px;font-weight:600;color:${PHT_COLORS.navy};letter-spacing:0.01em">${escapeHtml(line)}</span>
            </a>
          </td>
        </tr>`;
      },
    )
    .join('\n');
}

export const PHT_CUSTOM_MESSAGE_MARKER = '<!--PHT_CUSTOM_MESSAGE-->';

/** Plain-text paragraphs → styled HTML block for optional user note. */
export function formatCustomMessageHtml(message) {
  const trimmed = String(message ?? '').trim();
  if (!trimmed) return PHT_CUSTOM_MESSAGE_MARKER;
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;color:${PHT_COLORS.muted};line-height:1.65">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`,
    )
    .join('\n');
  return `<div style="margin:16px 0;padding:14px 18px;background:${PHT_COLORS.cardMuted};border-left:4px solid ${PHT_COLORS.accent};border-radius:0 8px 8px 0">\n${paragraphs}\n</div>`;
}

/** Insert or replace custom message block in an existing proposal HTML string. */
export function injectCustomMessageHtml(html, customMessage) {
  const block = formatCustomMessageHtml(customMessage);
  if (html.includes(PHT_CUSTOM_MESSAGE_MARKER)) {
    return html.replace(PHT_CUSTOM_MESSAGE_MARKER, block);
  }
  const anchor = '<!--PHT_SLOTS_HEADING-->';
  const idx = html.indexOf(anchor);
  if (idx === -1) return html;
  return `${html.slice(0, idx)}${block}\n              ${html.slice(idx)}`;
}

/** Append custom message to plain-text proposal body before slot list. */
export function injectCustomMessageText(text, customMessage) {
  const trimmed = String(customMessage ?? '').trim();
  if (!trimmed) return text;
  const marker = '\nIhre Terminvorschläge\n';
  const idx = text.indexOf(marker);
  const block = `\n${trimmed}\n`;
  if (idx === -1) return `${text}${block}`;
  return `${text.slice(0, idx)}${block}${text.slice(idx)}`;
}

/**
 * @param {{ customerName: string, introExtra?: string, customMessage?: string, slotCards: { label: string, url: string, weekday?: string }[], wishUrl?: string }} opts
 */
export function buildProposalEmailHtml({ customerName, introExtra = '', customMessage = '', slotCards, wishUrl }) {
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
        <table role="presentation" width="${PHT_EMAIL_MAX_WIDTH}" cellpadding="0" cellspacing="0" style="width:${PHT_EMAIL_MAX_WIDTH}px;max-width:${PHT_EMAIL_MAX_WIDTH}px;background:${PHT_COLORS.card};border:1px solid ${PHT_COLORS.cardBorder};border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(23,65,125,0.08)">
          ${phtWhiteHeaderBar()}
          ${phtHeroBanner('Wir sind für Sie da.')}
          <tr>
            <td style="padding:28px 28px 8px;color:${PHT_COLORS.text};line-height:1.65;font-size:15px;${emailContentBackgroundStyle()}">
              <p style="margin:0 0 16px;color:${PHT_COLORS.text};font-size:16px;font-weight:300">Sehr geehrte Damen und Herren,</p>
              <p style="margin:0 0 16px;color:${PHT_COLORS.muted}">
                mein Name ist <strong style="color:${PHT_COLORS.text}">Dominik Weller</strong> von der
                <a href="https://pht.group" style="${linkStyle()}">PHT Group</a>.
                Seit über 28 Jahren entwickeln wir ganzheitliche Hygienelösungen für die Lebensmittelindustrie –
                von der Planung über die Montage bis zur Wartung.
              </p>
              <p style="margin:0 0 16px;color:${PHT_COLORS.muted}">
                Gerne würde ich <strong style="color:${PHT_COLORS.text}">${safeName}</strong> persönlich besuchen, um
                vor Ort über Ihre Hygiene-Anlagen und Prozesse zu sprechen: Was funktioniert gut,
                wo gibt es Optimierungspotenzial, und wie können wir Sie bei Audit-Anforderungen unterstützen.
                Kein Verkaufsgespräch – sondern eine ehrliche fachliche Beratung aus der Praxis.
              </p>
              ${introExtra}
              ${formatCustomMessageHtml(customMessage)}
              <!--PHT_SLOTS_HEADING-->
              ${phtSectionHeading('Termin', 'Ihre Terminvorschläge')}
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
                <strong style="color:${PHT_COLORS.text}">Dominik Weller</strong><br/>
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
 * @param {{ customerName: string, introExtra?: string, customMessage?: string, slotCards: { label: string, url: string, weekday?: string }[], wishUrl?: string }} opts
 */
export function buildProposalEmailText({ customerName, introExtra = '', customMessage = '', slotCards, wishUrl }) {
  const regionalBlock = introExtra ? `\n${stripTags(introExtra)}\n` : '';
  const customBlock = customMessage?.trim() ? `\n${customMessage.trim()}\n` : '';
  const slotBlock = slotCards.map((s, i) => `${i + 1}. ${s.compactLabel ?? s.label}\n${s.url}`).join('\n\n');
  const wishBlock = wishUrl
    ? `\n\nKeiner passt? Eigenen Wunschtermin angeben:\n${wishUrl}\n`
    : '';

  return `Sehr geehrte Damen und Herren,

mein Name ist Dominik Weller von der PHT Group (https://pht.group).
Seit über 28 Jahren entwickeln wir ganzheitliche Hygienelösungen für die Lebensmittelindustrie –
von der Planung über die Montage bis zur Wartung.

Gerne würde ich ${customerName} persönlich besuchen, um vor Ort über Ihre Hygiene-Anlagen und Prozesse zu sprechen: Was funktioniert gut, wo gibt es Optimierungspotenzial, und wie können wir Sie bei Audit-Anforderungen unterstützen. Kein Verkaufsgespräch – sondern eine ehrliche fachliche Beratung aus der Praxis.
${regionalBlock}${customBlock}
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
        <td style="padding:8px 0 0">
          <a href="${escapeHtml(wishUrl)}" style="display:block;text-decoration:none;background:${PHT_COLORS.white};border:2px solid ${PHT_COLORS.navy};border-radius:6px;padding:14px 20px;text-align:center">
            <div style="font-size:14px;font-weight:600;color:${PHT_COLORS.navy}">Keiner passt? Eigenen Wunschtermin angeben</div>
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
    body { font-family: 'Segoe UI', Inter, Arial, sans-serif; background: ${PHT_COLORS.bg}; color: ${PHT_COLORS.text}; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 12px; }
    .card { max-width: ${PHT_EMAIL_MAX_WIDTH}px; width: 100%; background: ${PHT_COLORS.card}; border: 1px solid ${PHT_COLORS.cardBorder}; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 24px rgba(23,65,125,0.08); }
    .header-bar { padding: 14px 28px; background: ${PHT_COLORS.white}; border-bottom: 1px solid ${PHT_COLORS.cardBorder}; }
    .header-bar img { display: block; height: auto; max-width: 120px; }
    .hero { padding: 28px 28px 24px; ${webHeroBackgroundStyle()} }
    .hero p { margin: 0; font-size: 22px; font-weight: 300; color: ${PHT_COLORS.white}; line-height: 1.35; }
    .hero .label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.75); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
    .content { padding: 28px; ${webContentBackgroundStyle()} }
    .section-heading { display: flex; gap: 14px; align-items: stretch; margin-bottom: 20px; }
    .section-heading .accent { width: 4px; background: ${PHT_COLORS.accent}; border-radius: 2px; flex-shrink: 0; }
    .section-heading .label { font-size: 10px; font-weight: 700; color: ${PHT_COLORS.accent}; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 4px; }
    .section-heading h1 { font-size: 1.35rem; margin: 0; color: ${PHT_COLORS.text}; font-weight: 300; }
    .subtitle { color: ${PHT_COLORS.muted}; font-size: 14px; line-height: 1.55; margin-bottom: 24px; }
    label { display: block; font-size: 11px; font-weight: 600; color: ${PHT_COLORS.muted}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    input, textarea, select { width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid ${PHT_COLORS.cardBorder}; background: ${PHT_COLORS.white}; color: ${PHT_COLORS.text}; font-size: 15px; margin-bottom: 16px; }
    input:focus, textarea:focus { outline: none; border-color: ${PHT_COLORS.navy}; box-shadow: 0 0 0 2px rgba(23,65,125,0.12); }
    input[readonly] { background: ${PHT_COLORS.cardMuted}; opacity: 0.9; cursor: default; }
    textarea { min-height: 88px; resize: vertical; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .row > div label { margin-top: 0; }
    .mode-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
    .mode-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid ${PHT_COLORS.cardBorder}; background: ${PHT_COLORS.white}; color: ${PHT_COLORS.muted}; font-size: 13px; cursor: pointer; }
    .mode-btn.active { border-color: ${PHT_COLORS.navy}; color: ${PHT_COLORS.navy}; background: rgba(23,65,125,0.06); font-weight: 600; }
    .range-fields { display: none; }
    .range-fields.visible { display: block; }
    button[type=submit] { width: 100%; padding: 14px; border: none; border-radius: 6px; background: ${PHT_COLORS.accent}; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    button[type=submit]:hover { background: ${PHT_COLORS.accentDark}; }
    .footer { padding: 20px 28px; border-top: 1px solid ${PHT_COLORS.cardBorder}; background: ${PHT_COLORS.cardMuted}; text-align: center; font-size: 11px; color: ${PHT_COLORS.dim}; }
    .footer a { color: ${PHT_COLORS.navy}; text-decoration: none; font-weight: 600; }
    .footer img { max-width: 90px; height: auto; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-bar">
      <a href="https://pht.group"><img src="${PHT_LOGO_URL}" width="120" height="40" alt="PHT Group"/></a>
    </div>
    <div class="hero">
      <div class="label">Termin</div>
      <p>Wie dürfen wir Ihnen helfen?</p>
    </div>
    <div class="content">
      <div class="section-heading">
        <div class="accent"></div>
        <div>
          <div class="label">Wunschtermin</div>
          <h1>Eigenen Termin angeben</h1>
        </div>
      </div>
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
      <img src="${PHT_LOGO_URL}" width="90" height="30" alt="PHT Group"/>
      <div><a href="https://pht.group">pht.group</a> · Hygienelösungen für die Lebensmittelindustrie</div>
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
    heroTagline: 'Vielen Dank für Ihre Nachricht.',
    bodyHtml: `<p>Ihr Wunschtermin wurde übermittelt. Wir melden uns zur Bestätigung.</p><p style="margin-top:16px;font-size:13px">Bei Rückfragen erreichen Sie uns unter <a href="mailto:weller@pht.group" style="color:${PHT_COLORS.navy};font-weight:600">weller@pht.group</a>.</p>`,
    variant: 'success',
  });
}

/** German weekday label from YYYY-MM-DD */
export function weekdayLabelGerman(dateStr) {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const d = new Date(`${dateStr}T12:00:00`);
  return days[d.getDay()] ?? '';
}
