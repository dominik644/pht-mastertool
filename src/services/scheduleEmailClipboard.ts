import { buildEmlContent } from '../../lib/scheduleEmailMime.js';

async function writeClipboard(items: Record<string, Blob>) {
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard API nicht verfügbar');
  }
  await navigator.clipboard.write([new ClipboardItem(items)]);
}

/** Copy HTML + plain text so Outlook paste keeps design and links. */
export async function copyRichEmailPreview(params: {
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const { subject, html, text } = params;
  const plainWithSubject = `Betreff: ${subject}\n\n${text}`;
  await writeClipboard({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([plainWithSubject], { type: 'text/plain' }),
  });
}

/** Copy branded HTML email for Ctrl+V in Outlook. */
export async function copyHtmlEmail(params: { html: string; text: string }): Promise<void> {
  await writeClipboard({
    'text/html': new Blob([params.html], { type: 'text/html' }),
    'text/plain': new Blob([params.text], { type: 'text/plain' }),
  });
}

/** Download .eml file – double-click opens in Outlook with HTML body. */
export function downloadEmlFile(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): void {
  const eml = buildEmlContent(params);
  const blob = new Blob([eml], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeName = params.subject.replace(/[^\wäöüÄÖÜß\- ]+/g, '').slice(0, 60).trim() || 'terminvorschlag';
  anchor.download = `${safeName}.eml`;
  anchor.click();
  URL.revokeObjectURL(url);
}
