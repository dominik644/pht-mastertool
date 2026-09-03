import type { BusyInterval } from './calendarBusyTimes';

export interface ScheduleSlotOption {
  label: string;
  url: string;
}

export interface ScheduleCalendarStats {
  targetCount: number;
  freeCount: number;
  proposedCount: number;
  calendarConnected: boolean;
  calendarChecked: boolean;
  source?: string;
}

export interface ScheduleProposalResult {
  ok: boolean;
  configured: boolean;
  skipped?: boolean;
  error?: string;
  proposalId?: string;
  slotCount?: number;
  slotOptions?: ScheduleSlotOption[];
  sentTo?: string;
  message?: string;
  preview?: boolean;
  calendar?: ScheduleCalendarStats;
  emailPreview?: {
    subject: string;
    html: string;
    text: string;
    mailtoBody?: string;
    mailtoUrl?: string;
  };
}

export interface ScheduleProposalStatus {
  configured: boolean;
  skipped?: boolean;
  storage?: boolean;
  storageMode?: string;
  email?: boolean;
  emailPreviewFallback?: boolean;
  devTokenFallback?: boolean;
}

function friendlyScheduleError(raw?: string): string {
  if (!raw) return 'Terminvorschlag konnte nicht erstellt werden.';
  if (/supabase|PGRST|404|details null/i.test(raw)) {
    return 'Terminvorschlag konnte nicht gespeichert werden. Bitte erneut versuchen.';
  }
  return raw;
}

export interface ScheduleCustomRequest {
  proposalId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  territory: string;
  customRequest: {
    dateFrom: string;
    dateTo?: string | null;
    timeFrom: string;
    timeTo?: string | null;
    message?: string;
    submittedAt: string;
  };
  submittedAt: string;
  expiresAt: string;
}

export interface AcceptCustomRequestResult {
  ok: boolean;
  error?: string;
  customerId?: string;
  scheduledVisit?: string;
  nextDue?: string;
  notes?: string;
}

function formatCustomRequestLabel(cr: ScheduleCustomRequest['customRequest']): string {
  const datePart = cr.dateTo && cr.dateTo !== cr.dateFrom
    ? `${cr.dateFrom} – ${cr.dateTo}`
    : cr.dateFrom;
  const timePart = cr.timeTo ? `${cr.timeFrom}–${cr.timeTo}` : cr.timeFrom;
  return `${datePart}, ${timePart} Uhr`;
}

export { formatCustomRequestLabel };

export async function fetchCustomRequests(): Promise<ScheduleCustomRequest[]> {
  try {
    const res = await fetch('/api/schedule-custom-requests?status=custom_request');
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.requests) return [];
    return body.requests as ScheduleCustomRequest[];
  } catch {
    return [];
  }
}

export async function acceptCustomRequest(proposalId: string): Promise<AcceptCustomRequestResult> {
  try {
    const res = await fetch('/api/schedule-wish-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Fehler ${res.status}` };
    }
    return {
      ok: true,
      customerId: body.customerId,
      scheduledVisit: body.scheduledVisit,
      nextDue: body.nextDue,
      notes: body.notes,
    };
  } catch {
    return { ok: false, error: 'Verbindung fehlgeschlagen' };
  }
}

export async function fetchScheduleProposalStatus(): Promise<ScheduleProposalStatus> {
  try {
    const res = await fetch('/api/schedule-proposal', { method: 'OPTIONS' });
    const body = await res.json().catch(() => ({}));
    return {
      configured: body.configured === true,
      skipped: body.skipped === true,
      storage: body.storage,
      storageMode: body.storageMode,
      email: body.email,
      emailPreviewFallback: body.emailPreviewFallback,
      devTokenFallback: body.devTokenFallback,
    };
  } catch {
    return { configured: false, skipped: true };
  }
}

export async function sendScheduleProposal(params: {
  customerId: string;
  customerEmail?: string;
  territory?: string;
  busyTimes?: BusyInterval[];
  calendarConnected?: boolean;
}): Promise<ScheduleProposalResult> {
  try {
    const res = await fetch('/api/schedule-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 503) {
      return {
        ok: false,
        configured: false,
        skipped: body.skipped === true,
        error: friendlyScheduleError(body.error ?? 'Terminvorschläge nicht konfiguriert'),
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        configured: body.configured !== false,
        error: friendlyScheduleError(body.error ?? `Fehler ${res.status}`),
        calendar: body.calendar,
      };
    }
    if (body.preview && body.emailPreview) {
      return {
        ok: true,
        configured: true,
        preview: true,
        proposalId: body.proposalId,
        slotCount: body.slotCount,
        slotOptions: body.slotOptions,
        sentTo: body.sentTo,
        calendar: body.calendar,
        emailPreview: body.emailPreview,
        message: body.message ?? 'E-Mail-Vorschau bereit – bitte manuell senden',
      };
    }
    return {
      ok: true,
      configured: true,
      proposalId: body.proposalId,
      slotCount: body.slotCount,
      slotOptions: body.slotOptions,
      sentTo: body.sentTo,
      calendar: body.calendar,
      message: body.message ?? `Terminvorschläge (${body.slotCount} Slots) an ${body.sentTo} gesendet`,
    };
  } catch (err) {
    return {
      ok: false,
      configured: false,
      error: 'Verbindung zum Server fehlgeschlagen – bitte Seite neu laden und erneut versuchen.',
    };
  }
}
