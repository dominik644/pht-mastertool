import { findCustomerById } from './customerLookup.js';
import { createServerCalendarEvent, hasServerCalendarWriteConfig } from './microsoftCalendarServer.js';
import { getCalendarUser } from './calendarBusyTimes.js';
import { fetchScheduleProposalsByStatus, updateScheduleProposal } from './supabaseScheduleProposals.js';

export const FOLLOW_UP_DAYS = 14;
export const FOLLOW_UP_CALL_MINUTES = 30;

function getPublicBaseUrl() {
  const env = process.env.SCHEDULE_PUBLIC_BASE_URL?.trim();
  if (env) {
    return env.startsWith('http') ? env.replace(/\/$/, '') : `https://${env.replace(/\/$/, '')}`;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return vercel.startsWith('http') ? vercel.replace(/\/$/, '') : `https://${vercel.replace(/\/$/, '')}`;
  }
  return 'http://localhost:5173';
}

/**
 * @param {string} iso
 */
function addDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Next 10:00 Europe/Berlin on or after `minDate` (local wall clock).
 * @param {Date} minDate
 */
function nextFollowUpSlot(minDate) {
  const candidate = new Date(minDate);
  candidate.setHours(10, 0, 0, 0);
  if (candidate.getTime() < Date.now()) {
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(10, 0, 0, 0);
  }
  return candidate;
}

/**
 * @param {Date} start
 * @param {number} minutes
 */
function formatLocalIso(start, minutes) {
  const end = new Date(start.getTime() + minutes * 60_000);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { start: fmt(start), end: fmt(end) };
}

/**
 * @param {object} proposal
 */
export function proposalNeedsFollowUp(proposal, now = new Date()) {
  if (proposal.status !== 'pending') return false;
  if (proposal.follow_up_scheduled_at) return false;
  const created = new Date(proposal.created_at ?? proposal.expires_at);
  if (Number.isNaN(created.getTime())) return false;
  const dueAt = addDays(created.toISOString(), FOLLOW_UP_DAYS);
  return dueAt.getTime() <= now.getTime();
}

/**
 * @param {object} proposal
 */
export function buildFollowUpEventContent(proposal) {
  const customer = findCustomerById(proposal.customer_id);
  const phone = customer?.contactPhone?.trim() || '–';
  const email = proposal.customer_email || customer?.contactEmail || '–';
  const company = proposal.customer_name;
  const location = customer ? `${customer.zip ?? ''} ${customer.city ?? ''}`.trim() : '';
  const sector = customer?.sectorLabel || customer?.sector || '';
  const baseUrl = getPublicBaseUrl();
  const appLink = `${baseUrl}/priorities?q=${encodeURIComponent(company)}`;
  const sentAt = proposal.created_at
    ? new Date(proposal.created_at).toLocaleDateString('de-DE')
    : '–';

  const subject = `Anruf: ${company} – Termin nicht bestätigt`;
  const bodyLines = [
    'Terminvorschlag nicht bestätigt – bitte Kunden anrufen.',
    '',
    `Kunde: ${company}`,
    location ? `Ort: ${location}` : null,
    sector ? `Branche: ${sector}` : null,
    `Telefon: ${phone}`,
    `E-Mail: ${email}`,
    '',
    `Terminvorschlag gesendet: ${sentAt}`,
    `Vorschlag-ID: ${proposal.id}`,
    '',
    `Kunde in der App: ${appLink}`,
    '',
    'PHT Group · Vertrieb Ost',
  ].filter(Boolean);

  const created = new Date(proposal.created_at ?? Date.now());
  const targetDay = addDays(created.toISOString(), FOLLOW_UP_DAYS);
  const slotStart = nextFollowUpSlot(targetDay);
  const { start, end } = formatLocalIso(slotStart, FOLLOW_UP_CALL_MINUTES);

  return {
    subject,
    body: bodyLines.join('\n'),
    start,
    end,
    location: location || undefined,
    calendarUser: proposal.sales_rep_email || getCalendarUser(),
  };
}

/**
 * @param {object} proposal
 */
export async function scheduleProposalFollowUp(proposal) {
  const event = buildFollowUpEventContent(proposal);

  if (!hasServerCalendarWriteConfig()) {
    await updateScheduleProposal(proposal.id, {
      follow_up_error: 'Microsoft Graph Kalender nicht konfiguriert',
    });
    return {
      ok: false,
      skipped: true,
      proposalId: proposal.id,
      error: 'Microsoft Graph Kalender nicht konfiguriert',
      scheduledAt: event.start,
    };
  }

  const calendarResult = await createServerCalendarEvent({
    subject: event.subject,
    body: event.body,
    start: event.start,
    end: event.end,
    location: event.location,
    calendarUser: event.calendarUser,
  });

  if (calendarResult.ok) {
    await updateScheduleProposal(proposal.id, {
      status: 'expired',
      follow_up_scheduled_at: new Date().toISOString(),
      follow_up_event_id: calendarResult.id,
      follow_up_error: null,
    });
    return {
      ok: true,
      proposalId: proposal.id,
      eventId: calendarResult.id,
      scheduledAt: event.start,
      calendarUser: event.calendarUser,
    };
  }

  await updateScheduleProposal(proposal.id, {
    follow_up_error: calendarResult.error ?? 'Kalendereintrag fehlgeschlagen',
  });

  return {
    ok: false,
    skipped: Boolean(calendarResult.skipped),
    proposalId: proposal.id,
    error: calendarResult.error,
    scheduledAt: event.start,
    calendarUser: event.calendarUser,
  };
}

/**
 * Scan pending proposals and schedule follow-up Outlook calls.
 */
export async function runScheduleProposalFollowUps() {
  const loaded = await fetchScheduleProposalsByStatus('pending');
  if (!loaded.ok) {
    return {
      ok: false,
      error: loaded.error ?? 'Vorschläge konnten nicht geladen werden',
      processed: 0,
      results: [],
    };
  }

  const candidates = (loaded.proposals ?? []).filter((p) => proposalNeedsFollowUp(p));
  const results = [];

  for (const proposal of candidates) {
    results.push(await scheduleProposalFollowUp(proposal));
  }

  return {
    ok: true,
    candidateCount: candidates.length,
    processed: results.length,
    scheduled: results.filter((r) => r.ok).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    graphConfigured: hasServerCalendarWriteConfig(),
    results,
  };
}
