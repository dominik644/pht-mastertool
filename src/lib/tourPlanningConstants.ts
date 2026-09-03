/** Shared tour / route planning constants (Tourenplanung). */

export const APPOINTMENT_MINUTES = 60;
export const MAX_DAY_STOPS = 5;
export const MIN_DAY_STOPS = 2;
export const DRIVE_SPEED_KMH = 70;
export const ROAD_FACTOR = 1.3;

export const WORKDAY_START_MINUTES = 8 * 60;
export const WORKDAY_END_MINUTES = 17 * 60;

export const DEFAULT_TRAVEL_BUFFER_MINUTES = 15;
export const MAX_TRAVEL_BUFFER_MINUTES = 30;

export interface DayBreakBlock {
  startMinutes: number;
  endMinutes: number;
  label: string;
  kind: 'coffee' | 'lunch';
}

/** Fixed breaks for realistic day planning (morning coffee, lunch, afternoon coffee). */
export const STANDARD_DAY_BREAKS: DayBreakBlock[] = [
  { startMinutes: 10 * 60, endMinutes: 10 * 60 + 15, label: 'Kaffeepause', kind: 'coffee' },
  { startMinutes: 12 * 60, endMinutes: 13 * 60, label: 'Mittagspause', kind: 'lunch' },
  { startMinutes: 15 * 60, endMinutes: 15 * 60 + 15, label: 'Kaffeepause', kind: 'coffee' },
];

export const STANDARD_BREAK_MINUTES = STANDARD_DAY_BREAKS.reduce(
  (sum, b) => sum + (b.endMinutes - b.startMinutes),
  0,
);

/** Net time for visits + driving within 08:00–17:00 after standard breaks. */
export const AVAILABLE_ROUTE_MINUTES =
  WORKDAY_END_MINUTES - WORKDAY_START_MINUTES - STANDARD_BREAK_MINUTES;
