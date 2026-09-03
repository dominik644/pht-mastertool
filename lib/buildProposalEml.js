/**
 * Branded Terminvorschlag .eml builder (multipart/alternative + attachments).
 * Shared between browser compose panel and server-side fallbacks.
 */

import { encodeRfc2047Subject } from './scheduleEmailMime.js';
import {
  injectCustomMessageHtml,
  injectCustomMessageText,
} from './scheduleEmailTemplate.js';

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

function foldBase64(b64) {
  return b64.replace(/.{1,76}/g, '$&\r\n').trim();
}

function encodeFilename(name) {
  if (!/[^\x00-\x7F]/.test(name)) return name;
  return `=?UTF-8?B?${utf8ToBase64(name)}?=`;
}

/**
 * Merge optional user Nachricht into server-generated HTML/text preview.
 * @param {{ html: string, text: string, customMessage?: string }} params
 */
export function mergeProposalEmailContent({ html, text, customMessage = '' }) {
  const msg = String(customMessage ?? '').trim();
  if (!msg) return { html, text };
  return {
    html: injectCustomMessageHtml(html, msg),
    text: injectCustomMessageText(text, msg),
  };
}

/**
 * Build RFC 822 .eml with HTML + plain alternative and optional file attachments.
 * @param {{
 *   from?: string,
 *   to: string,
 *   subject: string,
 *   html: string,
 *   text: string,
 *   attachments?: { name: string, contentType?: string, contentBytes: string }[],
 * }} params
 */
export function buildProposalEml({
  from = DEFAULT_FROM,
  to,
  subject,
  html,
  text,
  attachments = [],
}) {
  const encodedSubject = encodeRfc2047Subject(subject);
  const attList = Array.isArray(attachments)
    ? attachments.filter((a) => a?.name && a?.contentBytes).slice(0, 3)
    : [];

  const altBoundary = `----=_PHT_ALT_${Date.now().toString(36)}`;
  const plainB64 = foldBase64(utf8ToBase64(text));
  const htmlB64 = foldBase64(utf8ToBase64(html));

  const alternativePart = [
    `--${altBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    plainB64,
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    '',
    `--${altBoundary}--`,
    '',
  ].join('\r\n');

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'X-Unsent: 1',
  ];

  if (!attList.length) {
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      alternativePart,
    ].join('\r\n');
  }

  const mixedBoundary = `----=_PHT_MIX_${Date.now().toString(36)}`;
  const attachmentParts = attList.map((att) => {
    const filename = encodeFilename(att.name);
    const contentType = att.contentType || 'application/octet-stream';
    const b64 = foldBase64(att.contentBytes.replace(/\s/g, ''));
    return [
      `--${mixedBoundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      b64,
      '',
    ].join('\r\n');
  });

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    alternativePart,
    ...attachmentParts,
    `--${mixedBoundary}--`,
    '',
  ].join('\r\n');
}

/**
 * Open .eml in the default mail client (Outlook on Windows when .eml is associated).
 * Prefers POST to /api/schedule-eml (Content-Disposition: inline) for reliable OS handoff;
 * falls back to a client-side message/rfc822 blob in hidden iframe.
 * @param {Parameters<typeof buildProposalEml>[0]} params
 */
export function openProposalInOutlook(params) {
  const target = `pht_eml_${Date.now()}`;
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/schedule-eml';
  form.target = target;
  form.style.display = 'none';
  form.acceptCharset = 'UTF-8';

  const fields = {
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? '',
    attachments: JSON.stringify(params.attachments ?? []),
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('textarea');
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  const popup = window.open('', target);
  form.submit();
  setTimeout(() => form.remove(), 2000);

  if (!popup) {
    openProposalEmlBlob(params);
  }
}

function openProposalEmlBlob(params) {
  const eml = buildProposalEml(params);
  const blob = new Blob([eml], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;border:0';
  iframe.src = url;
  document.body.appendChild(iframe);

  setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 120_000);
}
