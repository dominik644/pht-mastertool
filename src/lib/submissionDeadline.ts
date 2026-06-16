import { addDays, format, parseISO } from 'date-fns';
import type { Tender } from '../types/tender';

/**
 * TEMPORARY bootstrap filter: hide tenders with submission deadline < today + 14 days.
 * Auto-expires MIN_DEADLINE_BUFFER_DAYS after launch so short-lead tenders reappear
 * once ingest/matching has stabilized. Safe to remove this block after expiry.
 */
export const MIN_DEADLINE_BUFFER_LAUNCH_DATE = '2026-06-10';
export const MIN_DEADLINE_BUFFER_DAYS = 14;
export const MIN_DEADLINE_BUFFER_UNTIL = format(
  addDays(parseISO(MIN_DEADLINE_BUFFER_LAUNCH_DATE), MIN_DEADLINE_BUFFER_DAYS),
  'yyyy-MM-dd',
);

/** @deprecated Use MIN_DEADLINE_BUFFER_DAYS — kept for existing imports. */
export const MIN_SUBMISSION_LEAD_DAYS = MIN_DEADLINE_BUFFER_DAYS;

const BERLIN_TZ = 'Europe/Berlin';

/** True while the temporary 14-day minimum-deadline filter is in effect (Berlin calendar). */
export function isMinDeadlineBufferActive(todayBerlin = getBerlinToday()): boolean {
  return todayBerlin < MIN_DEADLINE_BUFFER_UNTIL;
}

/** German short date for UI chip, e.g. "24.06." */
export function getMinDeadlineBufferExpiryLabel(): string {
  const [, month, day] = MIN_DEADLINE_BUFFER_UNTIL.split('-');
  return `${day}.${month}.`;
}

/** Calendar date (YYYY-MM-DD) for "today" in Europe/Berlin. */
export function getBerlinToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: BERLIN_TZ });
}

export function parseSubmissionDeadlineDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

export function getSubmissionDeadlineDate(t: Pick<Tender, 'submissionDeadline' | 'deadline'>): string | null {
  return parseSubmissionDeadlineDate(t.submissionDeadline || t.deadline);
}

/** Whole days from Berlin today until submission deadline (negative = past). */
export function daysUntilSubmissionDeadline(deadline: string, todayBerlin = getBerlinToday()): number {
  const dateOnly = parseSubmissionDeadlineDate(deadline);
  if (!dateOnly) return Number.POSITIVE_INFINITY;
  const today = parseISO(todayBerlin);
  const target = parseISO(dateOnly);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * True when tender has no submission deadline or deadline is at least `minDays` after today (Berlin).
 * Tenders without a deadline are kept — the lead-time rule cannot be evaluated.
 */
export function meetsMinSubmissionLead(
  t: Pick<Tender, 'submissionDeadline' | 'deadline'>,
  minDays = MIN_DEADLINE_BUFFER_DAYS,
  todayBerlin = getBerlinToday(),
): boolean {
  const deadlineDate = getSubmissionDeadlineDate(t);
  if (!deadlineDate) return true;
  const minDeadline = format(addDays(parseISO(todayBerlin), minDays), 'yyyy-MM-dd');
  return deadlineDate >= minDeadline;
}

export function isSubmissionDeadlineTooSoon(
  t: Pick<Tender, 'submissionDeadline' | 'deadline'>,
  minDays = MIN_DEADLINE_BUFFER_DAYS,
): boolean {
  const deadlineDate = getSubmissionDeadlineDate(t);
  if (!deadlineDate) return false;
  return !meetsMinSubmissionLead(t, minDays);
}
