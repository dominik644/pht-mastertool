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
 * All weekday candidate slots within the horizon (not capped by count).
 * @param {Date} today
 */
export function buildCandidatePool(today = new Date()) {
  const slots = [];
  let cursor = nextBusinessDay(today);
  const end = new Date(today);
  end.setDate(end.getDate() + HORIZON_DAYS);

  while (cursor <= end) {
    if (isWeekday(cursor)) {
      const dateStr = formatDate(cursor);
      for (const startTime of SLOT_TIMES) {
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
 * Week index 0 = first 7 calendar days of horizon, 1 = second week.
 * @param {string} dateStr YYYY-MM-DD
 * @param {Date} today
 */
function weekIndexForDate(dateStr, today) {
  const anchor = nextBusinessDay(today);
  const slotDay = new Date(`${dateStr}T12:00:00`);
  const diff = Math.floor((slotDay - anchor) / 86_400_000);
  return diff < 7 ? 0 : 1;
}

/**
 * Pick up to `count` slots spread across different days (max one per day first pass).
 * @param {object[]} slots
 * @param {number} count
 */
function pickSpreadAcrossDays(slots, count) {
  const byDate = new Map();
  for (const slot of slots) {
    if (!byDate.has(slot.date)) byDate.set(slot.date, []);
    byDate.get(slot.date).push(slot);
  }
  const dates = [...byDate.keys()].sort();
  const picked = [];
  let round = 0;
  while (picked.length < count && dates.length) {
    for (const date of dates) {
      if (picked.length >= count) break;
      const daySlots = byDate.get(date);
      if (daySlots?.length) picked.push(daySlots.shift());
    }
    round += 1;
    if (round > 8) break;
  }
  return picked;
}

/**
 * Distribute slots evenly across week 1 and week 2 of the 14-day horizon.
 * @param {object[]} candidates
 * @param {number} targetCount
 * @param {Date} today
 */
export function distributeSlotsAcrossWeeks(candidates, targetCount, today = new Date()) {
  if (candidates.length <= targetCount) return candidates.slice(0, targetCount);

  const week0 = candidates.filter((s) => weekIndexForDate(s.date, today) === 0);
  const week1 = candidates.filter((s) => weekIndexForDate(s.date, today) === 1);

  const w0Target = Math.ceil(targetCount / 2);
  const w1Target = targetCount - w0Target;

  let fromW0 = pickSpreadAcrossDays(week0, w0Target);
  let fromW1 = pickSpreadAcrossDays(week1, w1Target);

  let combined = interleaveWeekSlots(fromW0, fromW1);

  if (combined.length < targetCount) {
    const used = new Set(combined.map((s) => s.id));
    const remaining = candidates.filter((s) => !used.has(s.id));
    const need = targetCount - combined.length;
    combined = [...combined, ...pickSpreadAcrossDays(remaining, need)];
  }

  return combined
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    .slice(0, targetCount);
}

function interleaveWeekSlots(week0, week1) {
  const result = [];
  const max = Math.max(week0.length, week1.length);
  for (let i = 0; i < max; i += 1) {
    if (week0[i]) result.push(week0[i]);
    if (week1[i]) result.push(week1[i]);
  }
  return result;
}

/**
 * @param {number} maxCount
 * @param {Date} today
 */
export function buildCandidateSlots(maxCount, today = new Date()) {
  return distributeSlotsAcrossWeeks(buildCandidatePool(today), maxCount, today);
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

  const pool = buildCandidatePool(today);
  const freePool = distributeSlotsAcrossWeeks(filterFreeSlots(pool, busyTimes), target, today);
  const baselineFree = filterFreeSlots(baseline, busyTimes);
  const proposed =
    freePool.length >= target
      ? freePool
      : freePool.length
        ? freePool
        : distributeSlotsAcrossWeeks(baseline, target, today);

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
