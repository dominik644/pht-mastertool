import { newSlotId } from './scheduleTokens.js';

const SLOT_TIMES = ['09:00', '10:30', '13:00', '14:30'];
const DURATION_MINUTES = 45;
const MIN_SLOTS = 3;
const MAX_SLOTS = 6;
const HORIZON_DAYS = 14;
const TARGET_SLOTS = 5;

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isWeekday(d) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function nextBusinessDay(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (!isWeekday(d)) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * @param {{ date: string, startIso: string, endIso: string }} slot
 * @param {{ start: string, end: string }[]} busyTimes
 */
export function slotOverlapsBusy(slot, busyTimes) {
  if (!busyTimes?.length) return false;
  const slotStart = new Date(slot.startIso);
  const slotEnd = new Date(slot.endIso);
  for (const busy of busyTimes) {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);
    if (slotStart < busyEnd && slotEnd > busyStart) return true;
  }
  return false;
}

/**
 * @param {object[]} slots
 * @param {{ start: string, end: string }[] | null | undefined} busyTimes
 */
export function filterFreeSlots(slots, busyTimes) {
  if (!busyTimes?.length) return slots;
  return slots.filter((s) => !slotOverlapsBusy(s, busyTimes));
}

/**
 * @param {number} maxCount
 * @param {Date} today
 */
export function buildCandidateSlots(maxCount, today = new Date()) {
  const slots = [];
  let cursor = nextBusinessDay(today);
  const end = new Date(today);
  end.setDate(end.getDate() + HORIZON_DAYS);

  while (slots.length < maxCount && cursor <= end) {
    if (isWeekday(cursor)) {
      const dateStr = formatDate(cursor);
      for (const startTime of SLOT_TIMES) {
        if (slots.length >= maxCount) break;
        const endTime = addMinutesToTime(startTime, DURATION_MINUTES);
        slots.push({
          id: newSlotId(),
          date: dateStr,
          startTime,
          endTime,
          startIso: `${dateStr}T${startTime}:00`,
          endIso: `${dateStr}T${endTime}:00`,
          taken: false,
        });
      }
    }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

/**
 * @param {number} [count]
 * @param {Date} [today]
 * @param {{ busyTimes?: { start: string, end: string }[] | null, calendarConnected?: boolean }} [options]
 */
export function generateVisitSlots(count = TARGET_SLOTS, today = new Date(), options = {}) {
  const target = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, count));
  const { busyTimes = null, calendarConnected = false } = options;

  const baseline = buildCandidateSlots(target, today);
  if (!busyTimes?.length) {
    return {
      slots: baseline.slice(0, target),
      stats: {
        targetCount: target,
        freeCount: baseline.length,
        proposedCount: Math.min(target, baseline.length),
        calendarConnected: false,
        calendarChecked: false,
      },
    };
  }

  const pool = buildCandidateSlots(Math.max(target * 4, 24), today);
  const freePool = filterFreeSlots(pool, busyTimes);
  const baselineFree = filterFreeSlots(baseline, busyTimes);
  const proposed = (freePool.length >= target ? freePool : freePool.length ? freePool : baseline).slice(0, target);

  return {
    slots: proposed,
    stats: {
      targetCount: target,
      freeCount: baselineFree.length,
      proposedCount: proposed.length,
      calendarConnected,
      calendarChecked: true,
    },
  };
}

export function formatSlotGerman(slot) {
  const [y, m, d] = slot.date.split('-');
  return `${d}.${m}.${y} ${slot.startTime}–${slot.endTime}`;
}

export function formatDateGerman(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export { DURATION_MINUTES, TARGET_SLOTS, HORIZON_DAYS };
