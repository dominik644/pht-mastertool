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
export const OWN_CALENDAR_KEY = 'pht_own_calendar_entries_v1';
export const OWN_CALENDAR_CHANGED_EVENT = 'pht-own-calendar-changed';

export interface OwnCalendarEntry {
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  busy: boolean;
  outlookEventId?: string;
  createdAt: string;
}

function notifyOwnCalendarChanged(): void {
  window.dispatchEvent(new CustomEvent(OWN_CALENDAR_CHANGED_EVENT));
}

function migrateLegacyBlocks(raw: unknown): OwnCalendarEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (item && typeof item === 'object' && 'id' in item && 'date' in item && 'title' in item) {
        const e = item as OwnCalendarEntry;
        return { ...e, busy: e.busy !== false };
      }
      const b = item as BusyInterval;
      const date = (b.start || '').slice(0, 10);
      const startTime = (b.start || '').slice(11, 16) || '08:00';
      const endTime = (b.end || '').slice(11, 16) || '17:00';
      if (!date) return null;
      return {
        id: `legacy-${date}-${i}`,
        title: b.label || 'Blockiert',
        date,
        allDay: startTime === '00:00' && (endTime === '23:59' || !endTime),
        startTime,
        endTime,
        busy: true,
        createdAt: new Date().toISOString(),
      } satisfies OwnCalendarEntry;
    })
    .filter((e): e is OwnCalendarEntry => Boolean(e?.date));
}

export function loadOwnCalendarEntries(): OwnCalendarEntry[] {
  try {
    const own = localStorage.getItem(OWN_CALENDAR_KEY);
    if (own) return migrateLegacyBlocks(JSON.parse(own) as unknown);
    const legacy = localStorage.getItem(MANUAL_BLOCKED_KEY);
    if (!legacy) return [];
    const migrated = migrateLegacyBlocks(JSON.parse(legacy) as unknown);
    if (migrated.length) saveOwnCalendarEntries(migrated, false);
    return migrated;
  } catch {
    return [];
  }
}

export function saveOwnCalendarEntries(entries: OwnCalendarEntry[], notify = true): void {
  localStorage.setItem(OWN_CALENDAR_KEY, JSON.stringify(entries));
  localStorage.setItem(MANUAL_BLOCKED_KEY, JSON.stringify(ownEntriesToBusy(entries)));
  if (notify) notifyOwnCalendarChanged();
}

export function ownEntryToBusy(entry: OwnCalendarEntry): BusyInterval {
  const start = entry.allDay ? `${entry.date}T00:00:00` : `${entry.date}T${entry.startTime || '08:00'}:00`;
  const end = entry.allDay ? `${entry.date}T23:59:59` : `${entry.date}T${entry.endTime || '17:00'}:00`;
  return { start, end, label: entry.title };
}

export function ownEntriesToBusy(entries: OwnCalendarEntry[] = loadOwnCalendarEntries()): BusyInterval[] {
  return entries.filter((e) => e.busy !== false).map(ownEntryToBusy);
}

export function addOwnCalendarEntry(input: Omit<OwnCalendarEntry, 'id' | 'createdAt'> & { id?: string }): OwnCalendarEntry {
  const entry: OwnCalendarEntry = {
    ...input,
    id: input.id ?? `own-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    busy: input.busy !== false,
  };
  saveOwnCalendarEntries([...loadOwnCalendarEntries(), entry]);
  return entry;
}

export function updateOwnCalendarEntry(id: string, patch: Partial<OwnCalendarEntry>): OwnCalendarEntry | null {
  const all = loadOwnCalendarEntries();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch, id };
  saveOwnCalendarEntries(all);
  return all[idx];
}

export function deleteOwnCalendarEntry(id: string): OwnCalendarEntry | null {
  const all = loadOwnCalendarEntries();
  const found = all.find((e) => e.id === id) ?? null;
  saveOwnCalendarEntries(all.filter((e) => e.id !== id));
  return found;
}

export function getManualBlockedTimes(): BusyInterval[] {
  return ownEntriesToBusy();
}

export function setManualBlockedTimes(times: BusyInterval[]): void {
  saveOwnCalendarEntries(migrateLegacyBlocks(times));
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
    const res = await fetch(`/api/calendar-busy?${qs.toString()}`, { credentials: 'include' });
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

function dayRange(dateStr: string): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    start: `${y}-${pad(m)}-${pad(d)}T00:00:00`,
    end: `${y}-${pad(m)}-${pad(d)}T23:59:59`,
  };
}

/** Busy intervals for a single calendar day (YYYY-MM-DD). */
export async function resolveCalendarBusyForDay(dateStr: string): Promise<CalendarBusyResult> {
  const manual = getManualBlockedTimes().filter((b) => b.start.slice(0, 10) === dateStr);
  const { start, end } = dayRange(dateStr);

  if (isMicrosoftConfigured()) {
    try {
      const graphBusy = await getCalendarBusyTimes(start, end);
      return {
        busyTimes: [...graphBusy, ...manual],
        connected: true,
        source: 'user-graph',
      };
    } catch {
      /* try server */
    }
  }

  const serverBusy = await fetchServerCalendarBusy(start, end);
  if (serverBusy.length > 0 || manual.length > 0) {
    return {
      busyTimes: [...serverBusy, ...manual],
      connected: serverBusy.length > 0,
      source: serverBusy.length > 0 ? 'server-graph' : 'manual',
    };
  }

  return { busyTimes: manual, connected: false, source: manual.length ? 'manual' : 'none' };
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
