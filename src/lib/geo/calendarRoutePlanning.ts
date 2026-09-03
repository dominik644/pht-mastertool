import type { PlannedRoute } from '../../services/plannedRoutesStorage';
import { computeStopSchedules } from '../../services/plannedRoutesStorage';
import type { CustomerPriority } from '../../types/customerPriority';
import type { CustomerVisitStore } from '../../types/customerPriority';
import type { BusyInterval } from '../../services/calendarBusyTimes';
import type { GeoPoint } from '../../services/customerGeocodes';
import { getCustomerVisitUrgency } from '../../services/customerVisitStorage';
import {
  APPOINTMENT_MINUTES,
  MAX_DAY_STOPS,
  estimateDriveMinutes,
  type RoutePlan,
  type RouteStop,
} from './routePlanning';
import {
  DEFAULT_TRAVEL_BUFFER_MINUTES,
  MAX_TRAVEL_BUFFER_MINUTES,
  WORKDAY_END_MINUTES,
  WORKDAY_START_MINUTES,
  computeDayGaps,
  extractDayAnchors,
  minutesToIso,
  minutesToTimeLabel,
  withStandardBreaks,
  type DayAnchor,
  type TimeGap,
} from './dayTimeSlots';

export const CALENDAR_ROUTE_BUFFER_MINUTES = DEFAULT_TRAVEL_BUFFER_MINUTES;

export interface ScheduledVisitStop {
  customer: CustomerPriority;
  point: GeoPoint;
  driveMinutesFromPrev: number;
  cumulativeDriveMinutes: number;
  startMinutes: number;
  endMinutes: number;
  startIso: string;
  endIso: string;
  slotLabel: string;
  gapIndex: number;
}

export interface CalendarAnchoredRoutePlan {
  date: string;
  origin: { label: string; point: GeoPoint };
  anchors: DayAnchor[];
  gaps: TimeGap[];
  stops: ScheduledVisitStop[];
  totalDriveMinutes: number;
  totalAppointmentMinutes: number;
  rejectedByCalendar: number;
  rejectedByTime: number;
  calendarConnected: boolean;
}

function urgencyScore(customer: CustomerPriority, store: CustomerVisitStore): number {
  const urgency = getCustomerVisitUrgency(customer, store);
  if (urgency === 'overdue') return 100;
  if (urgency === 'due_soon') return 50;
  if (customer.priority === 'A') return 30;
  if (customer.priority === 'B') return 15;
  return 5;
}

function scoreCandidate(
  driveMin: number,
  customer: CustomerPriority,
  store: CustomerVisitStore,
): number {
  return urgencyScore(customer, store) * 10 - driveMin;
}

function gapBufferForSize(gapMinutes: number): number {
  return gapMinutes >= 120 ? MAX_TRAVEL_BUFFER_MINUTES : DEFAULT_TRAVEL_BUFFER_MINUTES;
}

function tryPlaceInGap(
  gap: TimeGap,
  gapIndex: number,
  date: string,
  currentPoint: GeoPoint,
  pool: Array<{ customer: CustomerPriority; point: GeoPoint }>,
  used: Set<string>,
  store: CustomerVisitStore,
): { stop: ScheduledVisitStop; nextPoint: GeoPoint; gapCursor: number } | null {
  let bestIdx = -1;
  let bestScore = -Infinity;
  let bestDrive = 0;
  const gapCursor = gap.startMinutes;
  const buffer = gapBufferForSize(gap.endMinutes - gap.startMinutes);

  for (let i = 0; i < pool.length; i++) {
    const c = pool[i];
    if (used.has(c.customer.id)) continue;
    const drive = estimateDriveMinutes(currentPoint, c.point);
    const arrival = gapCursor + drive;
    const end = arrival + APPOINTMENT_MINUTES;
    if (end + buffer > gap.endMinutes) continue;
    const score = scoreCandidate(drive, c.customer, store);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
      bestDrive = drive;
    }
  }

  if (bestIdx < 0) return null;

  const picked = pool[bestIdx];
  const arrival = gapCursor + bestDrive;
  const end = arrival + APPOINTMENT_MINUTES;

  return {
    stop: {
      customer: picked.customer,
      point: picked.point,
      driveMinutesFromPrev: Math.round(bestDrive),
      cumulativeDriveMinutes: 0,
      startMinutes: arrival,
      endMinutes: end,
      startIso: minutesToIso(date, arrival),
      endIso: minutesToIso(date, end),
      slotLabel: `${minutesToTimeLabel(arrival)} – ${minutesToTimeLabel(end)}`,
      gapIndex,
    },
    nextPoint: picked.point,
    gapCursor: end + buffer,
  };
}

export function suggestCalendarAnchoredRoute(
  date: string,
  origin: { label: string; point: GeoPoint },
  candidates: Array<{ customer: CustomerPriority; point: GeoPoint }>,
  store: CustomerVisitStore,
  busyTimes: BusyInterval[],
  options: {
    excludeIds?: Set<string>;
    maxStops?: number;
    calendarConnected?: boolean;
  } = {},
): CalendarAnchoredRoutePlan {
  const maxStops = options.maxStops ?? MAX_DAY_STOPS;
  const used = new Set<string>(options.excludeIds ?? []);
  const pool = candidates.filter((c) => !used.has(c.customer.id));
  const allBusy = withStandardBreaks(date, busyTimes);
  const anchors = extractDayAnchors(date, allBusy);
  const gaps = computeDayGaps(date, busyTimes, { includeStandardBreaks: true });
  const stops: ScheduledVisitStop[] = [];
  let currentPoint = origin.point;
  let totalDrive = 0;
  let rejectedByCalendar = 0;
  let rejectedByTime = 0;

  for (let gapIndex = 0; gapIndex < gaps.length && stops.length < maxStops; gapIndex++) {
    const gap = gaps[gapIndex];
    let gapCursor = gap.startMinutes;
    const buffer = gapBufferForSize(gap.endMinutes - gap.startMinutes);

    while (stops.length < maxStops && gapCursor + APPOINTMENT_MINUTES + buffer <= gap.endMinutes) {
      const subGap: TimeGap = { startMinutes: gapCursor, endMinutes: gap.endMinutes };
      const placed = tryPlaceInGap(
        subGap,
        gapIndex,
        date,
        currentPoint,
        pool,
        used,
        store,
      );
      if (!placed) break;

      used.add(placed.stop.customer.id);
      totalDrive += placed.stop.driveMinutesFromPrev;
      placed.stop.cumulativeDriveMinutes = Math.round(totalDrive);
      stops.push(placed.stop);
      currentPoint = placed.nextPoint;
      gapCursor = placed.gapCursor;
    }
  }

  for (const c of pool) {
    if (used.has(c.customer.id)) continue;
    const drive = estimateDriveMinutes(currentPoint, c.point);
    let fitsAnyGap = false;
    for (const gap of gaps) {
      if (gap.endMinutes - gap.startMinutes >= drive + APPOINTMENT_MINUTES + DEFAULT_TRAVEL_BUFFER_MINUTES) {
        fitsAnyGap = true;
        break;
      }
    }
    if (!fitsAnyGap && busyTimes.length > 0) rejectedByCalendar += 1;
    else rejectedByTime += 1;
  }

  return {
    date,
    origin,
    anchors,
    gaps,
    stops,
    totalDriveMinutes: Math.round(totalDrive),
    totalAppointmentMinutes: stops.length * APPOINTMENT_MINUTES,
    rejectedByCalendar,
    rejectedByTime,
    calendarConnected: options.calendarConnected ?? busyTimes.length > 0,
  };
}

/** Re-schedule an existing route around calendar anchors, preserving stop order when possible. */
export function adaptRouteToCalendar(
  date: string,
  route: RoutePlan,
  busyTimes: BusyInterval[],
  calendarConnected = false,
): CalendarAnchoredRoutePlan {
  const anchors = extractDayAnchors(date, withStandardBreaks(date, busyTimes));
  const gaps = computeDayGaps(date, busyTimes, { includeStandardBreaks: true });
  const stops: ScheduledVisitStop[] = [];
  let currentPoint = route.origin.point;
  let totalDrive = 0;
  let rejectedByCalendar = 0;
  let gapIndex = 0;
  let gapCursor = gaps[0]?.startMinutes ?? WORKDAY_START_MINUTES;

  for (const stop of route.stops) {
    const drive = estimateDriveMinutes(currentPoint, stop.point);
    let placed = false;

    while (gapIndex < gaps.length && !placed) {
      const gap = gaps[gapIndex];
      if (gapCursor < gap.startMinutes) gapCursor = gap.startMinutes;
      const buffer = gapBufferForSize(gap.endMinutes - gap.startMinutes);
      const arrival = gapCursor + drive;
      const end = arrival + APPOINTMENT_MINUTES;

      if (end + buffer <= gap.endMinutes) {
        stops.push({
          customer: stop.customer,
          point: stop.point,
          driveMinutesFromPrev: Math.round(drive),
          cumulativeDriveMinutes: Math.round(totalDrive + drive),
          startMinutes: arrival,
          endMinutes: end,
          startIso: minutesToIso(date, arrival),
          endIso: minutesToIso(date, end),
          slotLabel: `${minutesToTimeLabel(arrival)} – ${minutesToTimeLabel(end)}`,
          gapIndex,
        });
        totalDrive += drive;
        currentPoint = stop.point;
        gapCursor = end + buffer;
        placed = true;
      } else {
        gapIndex += 1;
        gapCursor = gaps[gapIndex]?.startMinutes ?? WORKDAY_END_MINUTES;
      }
    }

    if (!placed) rejectedByCalendar += 1;
  }

  return {
    date,
    origin: route.origin,
    anchors,
    gaps,
    stops,
    totalDriveMinutes: Math.round(totalDrive),
    totalAppointmentMinutes: stops.length * APPOINTMENT_MINUTES,
    rejectedByCalendar,
    rejectedByTime: 0,
    calendarConnected,
  };
}

export function calendarAnchoredToRoutePlan(plan: CalendarAnchoredRoutePlan): RoutePlan {
  const routeStops: RouteStop[] = plan.stops.map((s) => ({
    customer: s.customer,
    point: s.point,
    driveMinutesFromPrev: s.driveMinutesFromPrev,
    cumulativeDriveMinutes: s.cumulativeDriveMinutes,
  }));

  return {
    origin: plan.origin,
    stops: routeStops,
    totalDriveMinutes: plan.totalDriveMinutes,
    totalAppointmentMinutes: plan.totalAppointmentMinutes,
    totalMinutes: plan.totalDriveMinutes + plan.totalAppointmentMinutes,
    returnDriveMinutes: 0,
    rejectedByTime: plan.rejectedByCalendar + plan.rejectedByTime,
  };
}

function stopToCustomer(stop: PlannedRoute['stops'][number]): CustomerPriority {
  return {
    id: stop.customerId,
    name: stop.customerName,
    zip: stop.zip,
    city: stop.city,
    priority: stop.priority,
  } as CustomerPriority;
}

/** Build a calendar timeline view from a saved route + Outlook busy blocks. */
export function buildCalendarPlanFromPlannedRoute(
  route: PlannedRoute,
  busyTimes: BusyInterval[],
  calendarConnected = false,
): CalendarAnchoredRoutePlan {
  const anchors = extractDayAnchors(route.date, busyTimes);
  const gaps = computeDayGaps(route.date, busyTimes);
  const schedules = computeStopSchedules(route);
  const origin = {
    label: route.homeBase.name,
    point: { lat: route.homeBase.lat, lng: route.homeBase.lng },
  };

  const stops: ScheduledVisitStop[] = route.stops.map((stop, i) => {
    const sched = schedules[i];
    return {
      customer: stopToCustomer(stop),
      point: { lat: stop.lat, lng: stop.lng },
      driveMinutesFromPrev: stop.driveMinutesFromPrev,
      cumulativeDriveMinutes: stop.driveMinutesFromPrev,
      startMinutes: sched.arrivalMinutes,
      endMinutes: sched.endMinutes,
      startIso: stop.scheduledStartIso ?? minutesToIso(route.date, sched.arrivalMinutes),
      endIso: stop.scheduledEndIso ?? minutesToIso(route.date, sched.endMinutes),
      slotLabel: sched.slotLabel,
      gapIndex: 0,
    };
  });

  return {
    date: route.date,
    origin,
    anchors,
    gaps,
    stops,
    totalDriveMinutes: route.stops.reduce((s, st) => s + st.driveMinutesFromPrev, 0),
    totalAppointmentMinutes: stops.length * APPOINTMENT_MINUTES,
    rejectedByCalendar: 0,
    rejectedByTime: 0,
    calendarConnected,
  };
}
