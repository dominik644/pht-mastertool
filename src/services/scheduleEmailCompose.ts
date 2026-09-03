import type { ScheduleSlotOption } from './scheduleProposal';
import type { EmailAttachment } from './microsoftGraph';

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export interface ScheduleAttachment {
  name: string;
  contentType: string;
  size: number;
  contentBytes: string;
}

export function buildDefaultProposalSubject(customerName: string): string {
  return `Persönlicher Besuch bei ${customerName} – Terminvorschläge von PHT`;
}

export function buildDefaultProposalBody(
  customerName: string,
  slotOptions: ScheduleSlotOption[],
): string {
  const lines = [
    `Guten Tag,`,
    '',
    `gerne möchte ich Sie persönlich bei ${customerName} besuchen. Bitte wählen Sie einen der folgenden Termine – die Buchung dauert nur einen Klick:`,
    '',
    ...slotOptions.map((s, i) => `${i + 1}. ${s.label}\n${s.url}`),
    '',
    'Jeder Termin dauert ca. 45 Minuten. Die Links sind 14 Tage gültig.',
    '',
    'Mit freundlichen Grüßen',
    'Dominik Weller · PHT Group · https://pht.group',
  ];
  return lines.join('\n');
}

export function buildMailtoUrl(params: { to: string; subject: string; body: string }): string {
  return `mailto:${params.to}?subject=${encodeURIComponent(params.subject)}&body=${encodeURIComponent(params.body)}`;
}

export async function readAttachmentFile(file: File): Promise<ScheduleAttachment | null> {
  if (file.size > MAX_ATTACHMENT_BYTES) return null;
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return {
    name: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    contentBytes: btoa(binary),
  };
}

export function toGraphAttachments(files: ScheduleAttachment[]): EmailAttachment[] {
  return files.map((f) => ({
    name: f.name,
    contentType: f.contentType,
    contentBytes: f.contentBytes,
  }));
}

export function formatAttachmentList(files: ScheduleAttachment[]): string {
  return files.map((f) => f.name).join(', ');
}
