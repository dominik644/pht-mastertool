/** Shared mailto + .eml helpers (Node + browser). */

const DEFAULT_FROM = 'Dominik Weller · PHT <termin@pht.group>';

function utf8ToBase64(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** RFC 2047 encoded-word for non-ASCII Subject lines. */
export function encodeRfc2047Subject(subject) {
  if (!/[^\x00-\x7F]/.test(subject)) return subject;
  return `=?UTF-8?B?${utf8ToBase64(subject)}?=`;
}

/**
 * Build mailto: URL with encodeURIComponent (%20 spaces – Outlook-safe).
 * @param {{ to: string, subject: string, body: string }} params
 */
export function buildMailtoUrl({ to, subject, body }) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * @param {{ from?: string, to: string, subject: string, html: string, text: string }} params
 */
export function buildEmlContent({ from = DEFAULT_FROM, to, subject, html, text }) {
  const boundary = `----=_PHT_${Date.now().toString(36)}`;
  const encodedSubject = encodeRfc2047Subject(subject);
  const plainB64 = utf8ToBase64(text);
  const htmlB64 = utf8ToBase64(html);

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    plainB64.replace(/.{1,76}/g, '$&\r\n').trim(),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64.replace(/.{1,76}/g, '$&\r\n').trim(),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}
