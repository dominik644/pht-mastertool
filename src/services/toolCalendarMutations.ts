import { addDays, format, parseISO } from 'date-fns';
import {
  addOwnCalendarEntry,
  deleteOwnCalendarEntry,
  ownEntryToBusy,
  updateOwnCalendarEntry,
  type OwnCalendarEntry,
} from './calendarBusyTimes';
import { createCalendarEvent, deleteCalendarEvent } from './microsoftGraph';
import { isMicrosoftConfigured } from './microsoftAuth';
import { hideCalendarEvent, suppressConfirmedVisit, type ToolCalendarEvent } from './toolCalendar';
import { clearScheduledVisit } from './customerVisitStorage';
import { removeStopFromPlannedRoute } from './plannedRoutesStorage';

export const APPOINTMENT_PRESETS = [
  { id: 'homeoffice', title: 'Homeoffice', allDay: true, showAs: 'workingElsewhere' as const },
  { id: 'intern', title: 'Intern', allDay: false, startTime: '09:00', endTime: '12:00', showAs: 'busy' as const },
  { id: 'unterwegs', title: 'Unterwegs', allDay: true, showAs: 'busy' as const },
  { id: 'privat', title: 'Privat', allDay: true, showAs: 'oof' as const },
  { id: 'custom', title: '', allDay: false, startTime: '09:00', endTime: '10:00', showAs: 'busy' as const },
] as const;

function nextDayIso(date: string): string {
  return format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
}

export async function createOwnAppointment(input: {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  syncOutlook: boolean;
}): Promise<{ entry: OwnCalendarEntry; message: string }> {
  const title = input.title.trim() || 'Termin';
  const entry = addOwnCalendarEntry({
    title,
    date: input.date,
    allDay: input.allDay,
    startTime: input.startTime || '08:00',
    endTime: input.endTime || '17:00',
    busy: true,
  });

  if (!input.syncOutlook || !isMicrosoftConfigured()) {
    return {
      entry,
      message: input.allDay
        ? `${title} eingetragen – ganzer Tag blockiert, keine Tour.`
        : `${title} eingetragen – Zeitraum für Touren gesperrt.`,
    };
  }

  try {
    const busy = ownEntryToBusy(entry);
    const start = input.allDay ? `${input.date}T00:00:00` : busy.start;
    const end = input.allDay ? `${nextDayIso(input.date)}T00:00:00` : busy.end;
    const showAs = /homeoffice/i.test(title) ? 'workingElsewhere' : /privat/i.test(title) ? 'oof' : 'busy';
    const created = await createCalendarEvent({
      subject: title,
      body: 'PHT Mastertool – blockiert Tourenplanung',
      start,
      end,
      isAllDay: input.allDay,
      showAs,
    });
    updateOwnCalendarEntry(entry.id, { outlookEventId: created.id });
    return { entry, message: `${title} im Tool und in Outlook eingetragen – keine Tour in diesem Zeitraum.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Outlook fehlgeschlagen';
    return { entry, message: `${title} im Tool gespeichert (Tour gesperrt). Outlook: ${msg}` };
  }
}

export async function deleteToolCalendarEvent(
  event: ToolCalendarEvent,
  opts?: { excludeTender?: (id: string) => void },
): Promise<{ message: string }> {
  hideCalendarEvent(event.id);

  if (event.kind === 'block' && event.ownId) {
    const removed = deleteOwnCalendarEntry(event.ownId);
    if (removed?.outlookEventId) {
      try {
        await deleteCalendarEvent(removed.outlookEventId);
      } catch {
        /* local delete is enough */
      }
    }
    return { message: `${event.title} gelöscht – Zeitraum wieder frei für Touren.` };
  }

  if (event.kind === 'deadline' && event.id.startsWith('deadline:')) {
    const tenderId = event.id.slice('deadline:'.length);
    opts?.excludeTender?.(tenderId);
    return { message: 'Frist aus dem Kalender entfernt.' };
  }

  if (event.kind === 'confirmed' && event.customerId) {
    suppressConfirmedVisit(event.customerId, event.start);
    clearScheduledVisit(event.customerId);
    return { message: 'Termin aus dem Kalender entfernt.' };
  }

  if (event.kind === 'tour' && event.id.startsWith('tour:')) {
    const parts = event.id.split(':');
    const routeId = parts[1];
    const customerId = parts[2];
    const stopIndex = parts[3] != null ? Number(parts[3]) : undefined;
    if (routeId && customerId) {
      removeStopFromPlannedRoute(routeId, customerId, Number.isFinite(stopIndex) ? stopIndex : undefined);
    }
    return { message: 'Tour-Stopp entfernt.' };
  }

  return { message: 'Eintrag aus dem Kalender entfernt.' };
}
