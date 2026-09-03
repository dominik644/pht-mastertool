import { newSlotId } from './scheduleTokens.js';

const SLOT_TIMES = ['09:00', '10:30', '13:00', '14:30'];
const DURATION_MINUTES = 45;
const MIN_SLOTS = 3;
const MAX_SLOTS = 6;
const HORIZON_DAYS = 14;

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
 * Generate 3–6 visit slots across the next 2 weeks (weekdays, business hours, 45 min).
 * @param {number} [count]
 * @param {Date} [today]
 */
export function generateVisitSlots(count = 5, today = new Date()) {
  const target = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, count));
  const slots = [];
  let cursor = nextBusinessDay(today);
  const end = new Date(today);
  end.setDate(end.getDate() + HORIZON_DAYS);

  while (slots.length < target && cursor <= end) {
    if (isWeekday(cursor)) {
      const dateStr = formatDate(cursor);
      for (const startTime of SLOT_TIMES) {
        if (slots.length >= target) break;
        const endTime = addMinutesToTime(startTime, DURATION_MINUTES);
        const id = newSlotId();
        slots.push({
          id,
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

  return slots.slice(0, target);
}

export function formatSlotGerman(slot) {
  const [y, m, d] = slot.date.split('-');
  return `${d}.${m}.${y} ${slot.startTime}–${slot.endTime}`;
}

export { DURATION_MINUTES };
