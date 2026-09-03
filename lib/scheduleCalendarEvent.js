import { formatSlotGerman } from './scheduleSlots.js';
import { getCalendarUser } from './calendarBusyTimes.js';
import { createServerCalendarEvent, hasServerCalendarWriteConfig } from './microsoftCalendarServer.js';

function formatIcsDate(iso) {
  return iso.replace(/[-:]/g, '').slice(0, 15);
}

function nowIcsStamp() {
  return `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

function escapeIcsText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * @param {{ subject: string, body: string, start: string, end: string, location?: string, organizerEmail: string, attendeeEmails?: string[] }} params
 */
export function buildConfirmedVisitIcs(params) {
  const uid = `pht-confirmed-${params.start}-${Math.random().toString(36).slice(2, 10)}@pht.group`;
  const attendees = (params.attendeeEmails ?? []).filter(Boolean);
  const attendeeLines = attendees.flatMap((email) => [
    `ATTENDEE;CN=${email};RSVP=TRUE:mailto:${email}`,
  ]);

  const event = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowIcsStamp()}`,
    `DTSTART:${formatIcsDate(params.start)}`,
    `DTEND:${formatIcsDate(params.end)}`,
    `SUMMARY:${escapeIcsText(params.subject)}`,
    `DESCRIPTION:${escapeIcsText(params.body)}`,
    params.location ? `LOCATION:${escapeIcsText(params.location)}` : null,
    `ORGANIZER;CN=${params.organizerEmail}:mailto:${params.organizerEmail}`,
    ...attendeeLines,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PHT Mastertool//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    event,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * @param {{ customerName: string, customerEmail: string, slot: object, location?: string }} ctx
 */
export async function createConfirmedVisitCalendarEvent(ctx) {
  const { customerName, customerEmail, slot } = ctx;
  const when = formatSlotGerman(slot);
  const organizer = getCalendarUser();
  const location = ctx.location ?? '';
  const subject = `Kundenbesuch: ${customerName}`;
  const body = [
    `Bestätigter Besuchstermin bei ${customerName}`,
    when,
    customerEmail ? `Kontakt: ${customerEmail}` : '',
    '',
    'PHT Group · https://pht.group',
  ].filter(Boolean).join('\n');

  const start = slot.startIso ?? `${slot.date}T${slot.startTime}:00`;
  const end = slot.endIso ?? `${slot.date}T${slot.endTime}:00`;
  const attendeeEmails = [organizer, customerEmail].filter(Boolean);

  let calendarResult = { ok: false, skipped: true };
  if (hasServerCalendarWriteConfig()) {
    calendarResult = await createServerCalendarEvent({
      subject,
      body,
      start,
      end,
      location,
      attendeeEmails,
    });
  }

  const ics = buildConfirmedVisitIcs({
    subject,
    body,
    start,
    end,
    location,
    organizerEmail: organizer,
    attendeeEmails,
  });

  return {
    ...calendarResult,
    ics,
    subject,
    when,
  };
}
