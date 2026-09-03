import {
  mergeProposalEmailContent,
  openProposalInOutlook,
} from '../../lib/buildProposalEml.js';
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

/** Optional personal note shown in the branded HTML block (not the full e-mail body). */
export function buildDefaultCustomMessage(_customerName: string, _slotOptions: ScheduleSlotOption[]): string {
  return '';
}

export function buildMergedProposalEmail(params: {
  html: string;
  text: string;
  customMessage?: string;
}): { html: string; text: string } {
  return mergeProposalEmailContent(params);
}

export { openProposalInOutlook };

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

export function toEmlAttachments(files: ScheduleAttachment[]): Array<{
  name: string;
  contentType: string;
  contentBytes: string;
}> {
  return files.map(({ name, contentType, contentBytes }) => ({ name, contentType, contentBytes }));
}

export function formatAttachmentList(files: ScheduleAttachment[]): string {
  return files.map((f) => f.name).join(', ');
}
