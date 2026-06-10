import type { Tender } from '../types/tender';
import type { TodoTask } from './microsoftIntegrations';
import { getTargetEmail } from './integrationSettings';

function formatIcsDate(iso: string): string {
  return iso.replace(/[-:]/g, '').slice(0, 15);
}

export function buildIcsContent(tender: Tender, start: string, end: string, attendeeEmail: string): string {
  const summary = `Angebotsfrist: ${tender.title.replace(/[,;\\]/g, '')}`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PHT Mastertool//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${tender.id}@pht-mastertool`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:PHT Ausschreibung\\n${tender.sourceUrl}`,
    `URL:${tender.sourceUrl}`,
    `ORGANIZER:mailto:${attendeeEmail}`,
    `ATTENDEE;CN=${attendeeEmail};RSVP=TRUE:mailto:${attendeeEmail}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(tender: Tender, start: string, end: string, email?: string): void {
  const attendee = email ?? getTargetEmail();
  const ics = buildIcsContent(tender, start, end, attendee);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pht-${tender.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function openGoogleCalendar(tender: Tender, start: string, end: string): void {
  const startG = formatIcsDate(start) + 'Z';
  const endG = formatIcsDate(end) + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Angebotsfrist: ${tender.title.slice(0, 80)}`,
    dates: `${startG}/${endG}`,
    details: `${tender.description}\n\n${tender.sourceUrl}`,
  });
  window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank', 'noopener,noreferrer');
}

export function openOutlookCompose(tender: Tender, start: string, end: string): void {
  const subject = encodeURIComponent(`Angebotsfrist: ${tender.title.slice(0, 80)}`);
  const body = encodeURIComponent(
    `PHT Ausschreibung\n\n${tender.title}\nDeadline: ${tender.deadline}\n${tender.sourceUrl}`,
  );
  window.open(
    `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${start}&enddt=${end}&body=${body}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function mailtoCalendarInvite(tender: Tender, email: string, start: string, end: string): void {
  const subject = encodeURIComponent(`Kalendereinladung: ${tender.title.slice(0, 60)}`);
  const body = encodeURIComponent(
    `PHT Mastertool – Kalendereintrag\n\n` +
    `Titel: ${tender.title}\n` +
    `Frist: ${tender.deadline}\n` +
    `Zeit: ${start} – ${end}\n` +
    `Link: ${tender.sourceUrl}\n\n` +
    `Bitte die angehängte ICS-Datei in Outlook/Google/Apple Kalender importieren.`,
  );
  downloadIcs(tender, start, end, email);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

export function mailtoTodoList(email: string, tasks: TodoTask[], title = 'PHT To Do Liste'): void {
  const body = tasks
    .map((t, i) => `${i + 1}. ${t.title}\n   Fällig: ${t.dueDate}\n   ${t.notes}`)
    .join('\n\n');
  const subject = encodeURIComponent(title);
  const encoded = encodeURIComponent(`PHT Mastertool – Aufgaben\n\n${body}`);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${encoded}`;
}

export function mailtoBulkDeadlines(email: string, tenders: Tender[]): void {
  const lines = tenders.map(
    (t) => `• ${t.deadline} – ${t.title} (${t.country})\n  ${t.sourceUrl}`,
  );
  const subject = encodeURIComponent(`PHT Ausschreibungs-Fristen (${tenders.length})`);
  const body = encodeURIComponent(`Fristenübersicht PHT Mastertool\n\n${lines.join('\n\n')}`);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}
