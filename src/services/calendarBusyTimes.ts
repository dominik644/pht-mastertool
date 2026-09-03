import { getCalendarBusyTimes } from './microsoftGraph';
import { isMicrosoftConfigured } from './microsoftAuth';

const HORIZON_DAYS = 14;

export interface BusyInterval {
  start: string;
  end: string;
  label?: string;
}

export interface CalendarBusyResult {
  busyTimes: BusyInterval[];
  connected: boolean;
  source: 'user-graph' | 'server-graph' | 'manual' | 'none';
}

export const MANUAL_BLOCKED_KEY = 'pht_calendar_blocked_times';

export function getManualBlockedTimes(): BusyInterval[] {
  try {
    const raw = localStorage.getItem(MANUAL_BLOCKED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BusyInterval[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setManualBlockedTimes(times: BusyInterval[]): void {
  localStorage.setItem(MANUAL_BLOCKED_KEY, JSON.stringify(times));
}

function horizonRange(days = HORIZON_DAYS): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 0);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  return { start: fmt(start), end: fmt(end) };
}

async function fetchServerCalendarBusy(start: string, end: string): Promise<BusyInterval[]> {
  try {
    const qs = new URLSearchParams({ start, end });
    const res = await fetch(`/api/calendar-busy?${qs.toString()}`);
    const body = await res.json().catch(() => ({}));
    if (body.ok && Array.isArray(body.busyTimes)) {
      return body.busyTimes as BusyInterval[];
    }
  } catch {
    /* fallback */
  }
  return [];
}

/** Resolve busy intervals: user Graph → server Graph → manual blocks. */
export async function resolveCalendarBusy(horizonDays = HORIZON_DAYS): Promise<CalendarBusyResult> {
  const manual = getManualBlockedTimes();
  const { start, end } = horizonRange(horizonDays);

  if (isMicrosoftConfigured()) {
    try {
      const graphBusy = await getCalendarBusyTimes(start, end);
      if (graphBusy.length >= 0) {
        return {
          busyTimes: [...graphBusy, ...manual],
          connected: true,
          source: 'user-graph',
        };
      }
    } catch {
      /* try server */
    }
  }

  const serverBusy = await fetchServerCalendarBusy(start, end);
  if (serverBusy.length > 0) {
    return {
      busyTimes: [...serverBusy, ...manual],
      connected: true,
      source: 'server-graph',
    };
  }

  if (manual.length > 0) {
    return { busyTimes: manual, connected: false, source: 'manual' };
  }

  return { busyTimes: [], connected: false, source: 'none' };
}

export function calendarStatusLabel(result: CalendarBusyResult, freeCount: number, targetCount: number): string {
  if (!result.connected && result.source === 'none') {
    return 'Kalender nicht verbunden – Termine nicht geprüft';
  }
  if (!result.connected && result.source === 'manual') {
    return `${freeCount} von ${targetCount} Terminen frei (manuelle Blockzeiten)`;
  }
  return `${freeCount} von ${targetCount} Terminen frei in deinem Kalender`;
}
