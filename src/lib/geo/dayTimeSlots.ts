import type { BusyInterval } from '../../services/calendarBusyTimes';
import { STANDARD_DAY_BREAKS } from '../tourPlanningConstants';

export const WORKDAY_START_MINUTES = 8 * 60;
export const WORKDAY_END_MINUTES = 17 * 60;
export const DEFAULT_TRAVEL_BUFFER_MINUTES = 15;
export const MAX_TRAVEL_BUFFER_MINUTES = 30;

export interface TimeGap {
  startMinutes: number;
  endMinutes: number;
}

export interface DayAnchor {
  startMinutes: number;
  endMinutes: number;
  label: string;
  startIso: string;
  endIso: string;
}

export function isoToMinutes(iso: string): number {
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso;
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesToIso(date: string, minutes: number): string {
  return `${date}T${minutesToTimeLabel(minutes)}:00`;
}

export function filterBusyForDate(date: string, busyTimes: BusyInterval[]): BusyInterval[] {
  return busyTimes.filter((b) => b.start.startsWith(date));
}

function mergeOverlapping(blocks: DayAnchor[]): DayAnchor[] {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: DayAnchor[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.startMinutes <= last.endMinutes) {
      last.endMinutes = Math.max(last.endMinutes, cur.endMinutes);
      if (cur.endIso > last.endIso) last.endIso = cur.endIso;
      if (!last.label && cur.label) last.label = cur.label;
      else if (last.label && cur.label && last.label !== cur.label) {
        last.label = `${last.label} / ${cur.label}`;
      }
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function extractDayAnchors(date: string, busyTimes: BusyInterval[]): DayAnchor[] {
  const blocks = filterBusyForDate(date, busyTimes).map((b) => ({
    startMinutes: isoToMinutes(b.start),
    endMinutes: isoToMinutes(b.end),
    label: b.label?.trim() || 'Kalendertermin',
    startIso: b.start,
    endIso: b.end,
  }));
  return mergeOverlapping(blocks);
}

export function standardBreakIntervals(date: string): BusyInterval[] {
  return STANDARD_DAY_BREAKS.map((b) => ({
    start: minutesToIso(date, b.startMinutes),
    end: minutesToIso(date, b.endMinutes),
    label: b.label,
  }));
}

export function withStandardBreaks(date: string, busyTimes: BusyInterval[]): BusyInterval[] {
  return [...busyTimes, ...standardBreakIntervals(date)];
}

/**
 * Free gaps between fixed calendar blocks, with travel buffer before/after meetings.
 */
export function computeDayGaps(
  date: string,
  busyTimes: BusyInterval[],
  options: {
    workStart?: number;
    workEnd?: number;
    bufferMinutes?: number;
    includeStandardBreaks?: boolean;
  } = {},
): TimeGap[] {
  const allBusy = options.includeStandardBreaks !== false
    ? withStandardBreaks(date, busyTimes)
    : busyTimes;
  const workStart = options.workStart ?? WORKDAY_START_MINUTES;
  const workEnd = options.workEnd ?? WORKDAY_END_MINUTES;
  const buffer = options.bufferMinutes ?? DEFAULT_TRAVEL_BUFFER_MINUTES;
  const anchors = extractDayAnchors(date, allBusy);
  const gaps: TimeGap[] = [];
  let cursor = workStart;

  for (const block of anchors) {
    const gapEnd = block.startMinutes - buffer;
    if (gapEnd > cursor) {
      gaps.push({ startMinutes: cursor, endMinutes: gapEnd });
    }
    cursor = Math.max(cursor, block.endMinutes + buffer);
  }

  if (workEnd > cursor) {
    gaps.push({ startMinutes: cursor, endMinutes: workEnd });
  }

  return gaps.filter((g) => g.endMinutes - g.startMinutes >= buffer);
}

export function intervalOverlapsMinutes(
  startMinutes: number,
  endMinutes: number,
  busyTimes: BusyInterval[],
  date: string,
): boolean {
  for (const b of filterBusyForDate(date, busyTimes)) {
    const bs = isoToMinutes(b.start);
    const be = isoToMinutes(b.end);
    if (startMinutes < be && endMinutes > bs) return true;
  }
  return false;
}

export interface TimelineEntry {
  kind: 'anchor' | 'visit' | 'gap' | 'break';
  startMinutes: number;
  endMinutes: number;
  label: string;
  customerId?: string;
  priority?: string;
}

export function buildTimelineEntries(
  _date: string,
  anchors: DayAnchor[],
  visits: Array<{
    startMinutes: number;
    endMinutes: number;
    label: string;
    customerId: string;
    priority: string;
  }>,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...anchors.map((a) => ({
      kind: (a.label.includes('pause') || a.label.includes('Pause') ? 'break' : 'anchor') as TimelineEntry['kind'],
      startMinutes: a.startMinutes,
      endMinutes: a.endMinutes,
      label: a.label,
    })),
    ...visits.map((v) => ({
      kind: 'visit' as const,
      startMinutes: v.startMinutes,
      endMinutes: v.endMinutes,
      label: v.label,
      customerId: v.customerId,
      priority: v.priority,
    })),
  ];

  entries.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  return entries;
}
