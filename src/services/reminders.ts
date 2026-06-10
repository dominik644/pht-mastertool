import { differenceInDays, parseISO } from 'date-fns';
import type { Reminder, Tender } from '../types/tender';

const REMINDER_THRESHOLDS = [14, 7, 3, 1] as const;

function getUrgency(daysLeft: number): Reminder['urgency'] {
  if (daysLeft <= 1) return 'critical';
  if (daysLeft <= 3) return 'high';
  if (daysLeft <= 7) return 'medium';
  return 'low';
}

export function getRemindersForTender(tender: Tender, today = new Date()): Reminder[] {
  if (tender.scoreRecommendation === 'NO-GO') return [];

  const deadline = parseISO(tender.deadline);
  const daysLeft = differenceInDays(deadline, today);

  if (daysLeft < 0) return [];

  const isRelevant = REMINDER_THRESHOLDS.some((t) => daysLeft <= t);
  if (!isRelevant) return [];

  return [
    {
      tenderId: tender.id,
      tenderTitle: tender.title,
      deadline: tender.deadline,
      daysLeft,
      urgency: getUrgency(daysLeft),
    },
  ];
}

export function getAllReminders(tenders: Tender[], today = new Date()): Reminder[] {
  return tenders
    .flatMap((t) => getRemindersForTender(t, today))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function getReminderLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'Heute fällig!';
  if (daysLeft === 1) return 'Morgen fällig';
  return `Noch ${daysLeft} Tage`;
}
