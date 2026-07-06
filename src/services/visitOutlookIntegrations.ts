import { format, parseISO } from 'date-fns';
import type { CustomerPriority } from '../types/customerPriority';
import { APPOINTMENT_MINUTES } from '../lib/geo/routePlanning';
import { getTargetEmail } from './integrationSettings';
import { isMicrosoftConfigured } from './microsoftAuth';
import { createCalendarEvent } from './microsoftGraph';
import {
  computeStopSchedules,
  formatMinutesAsTime,
  type PlannedRoute,
} from './plannedRoutesStorage';
import { getVisitState } from './customerVisitStorage';

export interface VisitCalendarSlot {
  subject: string;
  body: string;
  location: string;
  date: string;
  start: string;
  end: string;
  uid: string;
}

function formatIcsDate(iso: string): string {
  return iso.replace(/[-:]/g, '').slice(0, 15);
}

function nowIcsStamp(): string {
  return `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

function resolveEmail(override?: string): string {
  return override?.trim() || getTargetEmail();
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return formatMinutesAsTime(total);
}

export function defaultVisitDate(nextDue: string | null, today = new Date()): string {
  const todayStr = format(today, 'yyyy-MM-dd');
  if (!nextDue) return todayStr;
  return nextDue >= todayStr ? nextDue : todayStr;
}

export function buildCustomerVisitSlot(
  customer: CustomerPriority,
  date?: string,
  startTime = '09:00',
): VisitCalendarSlot {
  const visit = getVisitState(customer.id);
  const visitDate = date ?? defaultVisitDate(visit.nextDue);
  const endTime = addMinutesToTime(startTime, APPOINTMENT_MINUTES);
  const location = `${customer.zip} ${customer.city}`;
  const body = [
    `PHT Kundenbesuch · Prio ${customer.priority}`,
    `${customer.sectorLabel}`,
    visit.notes ? `Notizen: ${visit.notes}` : '',
    visit.nextDue ? `Fällig: ${visit.nextDue}` : '',
  ].filter(Boolean).join('\n');

  return {
    subject: `Kundenbesuch: ${customer.name}`,
    body,
    location,
    date: visitDate,
    start: `${visitDate}T${startTime}:00`,
    end: `${visitDate}T${endTime}:00`,
    uid: `pht-visit-${customer.id}@${visitDate}`,
  };
}

export function buildRouteVisitSlots(route: PlannedRoute): VisitCalendarSlot[] {
  const schedules = computeStopSchedules(route);
  return route.stops.map((stop, i) => {
    const sched = schedules[i];
    const visit = getVisitState(stop.customerId);
    const body = [
      `PHT Tour · Stopp ${i + 1}/${route.stops.length}`,
      `Prio ${stop.priority}`,
      visit.notes ? `Notizen: ${visit.notes}` : '',
    ].filter(Boolean).join('\n');

    return {
      subject: `Kundenbesuch: ${stop.customerName}`,
      body,
      location: `${stop.zip} ${stop.city}`,
      date: route.date,
      start: `${route.date}T${sched.arrivalLabel}:00`,
      end: `${route.date}T${sched.endLabel}:00`,
      uid: `pht-route-${route.id}-${stop.customerId}`,
    };
  });
}

function buildIcsContent(slots: VisitCalendarSlot[], attendeeEmail: string): string {
  const events = slots.map((slot) => [
    'BEGIN:VEVENT',
    `UID:${slot.uid}`,
    `DTSTAMP:${nowIcsStamp()}`,
    `DTSTART:${formatIcsDate(slot.start)}`,
    `DTEND:${formatIcsDate(slot.end)}`,
    `SUMMARY:${slot.subject.replace(/[,;\\]/g, '')}`,
    `DESCRIPTION:${slot.body.replace(/\n/g, '\\n').replace(/[,;\\]/g, '')}`,
    `LOCATION:${slot.location.replace(/[,;\\]/g, '')}`,
    `ORGANIZER:mailto:${attendeeEmail}`,
    `ATTENDEE;CN=${attendeeEmail};RSVP=TRUE:mailto:${attendeeEmail}`,
    'END:VEVENT',
  ].join('\r\n'));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PHT Mastertool//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadVisitIcs(slots: VisitCalendarSlot[], filename: string, email: string): void {
  const ics = buildIcsContent(slots, email);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openOutlookComposeVisit(slot: VisitCalendarSlot): void {
  const subject = encodeURIComponent(slot.subject);
  const body = encodeURIComponent(slot.body);
  const location = encodeURIComponent(slot.location);
  window.open(
    `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${slot.start}&enddt=${slot.end}&body=${body}&location=${location}`,
    '_blank',
    'noopener,noreferrer',
  );
}

async function createSlotsViaGraph(
  slots: VisitCalendarSlot[],
  email: string,
): Promise<number> {
  let created = 0;
  for (const slot of slots) {
    await createCalendarEvent({
      subject: slot.subject,
      body: slot.body,
      start: slot.start,
      end: slot.end,
      attendeeEmail: email,
    });
    created += 1;
  }
  return created;
}

export async function planCustomerVisitInOutlook(
  customer: CustomerPriority,
  targetEmail?: string,
  date?: string,
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);
  const slot = buildCustomerVisitSlot(customer, date);

  if (isMicrosoftConfigured()) {
    try {
      await createCalendarEvent({
        subject: slot.subject,
        body: slot.body,
        start: slot.start,
        end: slot.end,
        attendeeEmail: email,
      });
      return { success: true, message: `Termin in Outlook erstellt (${format(parseISO(slot.date), 'dd.MM.yyyy')}, ${APPOINTMENT_MINUTES} min).` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Graph API Fehler';
      if (!msg.includes('Nicht bei Microsoft')) {
        return { success: false, message: `${msg} – Fallback wird geöffnet.` };
      }
    }
  }

  openOutlookComposeVisit(slot);
  downloadVisitIcs([slot], `pht-besuch-${customer.id}.ics`, email);
  return {
    success: true,
    message: `Outlook-Compose & ICS (${APPOINTMENT_MINUTES} min) für ${email}.`,
  };
}

export async function planRouteInOutlook(
  route: PlannedRoute,
  targetEmail?: string,
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);
  const slots = buildRouteVisitSlots(route);
  if (slots.length === 0) {
    return { success: false, message: 'Keine Stopps auf der Route.' };
  }

  if (isMicrosoftConfigured() && slots.length <= 8) {
    try {
      const created = await createSlotsViaGraph(slots, email);
      if (created > 0) {
        return {
          success: true,
          message: `${created} Termine in Outlook erstellt (${route.date}, je ${APPOINTMENT_MINUTES} min).`,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Graph API Fehler';
      if (!msg.includes('Nicht bei Microsoft')) {
        return { success: false, message: `${msg} – Fallback wird geöffnet.` };
      }
    }
  }

  openOutlookComposeVisit(slots[0]);
  downloadVisitIcs(slots, `pht-route-${route.date}.ics`, email);
  return {
    success: true,
    message: `Outlook-Compose (1. Stopp) & ICS mit ${slots.length} Terminen für ${email}.`,
  };
}
