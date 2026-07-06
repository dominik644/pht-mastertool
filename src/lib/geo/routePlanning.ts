import type { CustomerPriority } from '../../types/customerPriority';
import type { CustomerVisitStore } from '../../types/customerPriority';
import { getCustomerVisitUrgency } from '../../services/customerVisitStorage';
import type { GeoPoint } from '../../services/customerGeocodes';

export const APPOINTMENT_MINUTES = 90;
export const MAX_DAY_STOPS = 4;
export const MIN_DAY_STOPS = 2;
export const WORKDAY_MINUTES = 9 * 60;
export const DRIVE_SPEED_KMH = 70;
export const ROAD_FACTOR = 1.3;

export interface RouteStop {
  customer: CustomerPriority;
  point: GeoPoint;
  driveMinutesFromPrev: number;
  cumulativeDriveMinutes: number;
}

export interface RoutePlan {
  origin: { label: string; point: GeoPoint };
  stops: RouteStop[];
  totalDriveMinutes: number;
  totalAppointmentMinutes: number;
  totalMinutes: number;
  rejectedByTime: number;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function estimateDriveMinutes(from: GeoPoint, to: GeoPoint): number {
  const roadKm = haversineKm(from, to) * ROAD_FACTOR;
  return (roadKm / DRIVE_SPEED_KMH) * 60;
}

function urgencyScore(
  customer: CustomerPriority,
  store: CustomerVisitStore,
): number {
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

export function suggestDayRoute(
  origin: { label: string; point: GeoPoint },
  candidates: Array<{ customer: CustomerPriority; point: GeoPoint }>,
  store: CustomerVisitStore,
  excludeIds: Set<string> = new Set(),
  maxStops: number = MAX_DAY_STOPS,
): RoutePlan {
  const pool = candidates.filter((c) => !excludeIds.has(c.customer.id));
  const stops: RouteStop[] = [];
  let current = origin.point;
  let totalDrive = 0;
  let totalAppt = 0;
  let rejected = 0;
  const used = new Set<string>(excludeIds);

  while (stops.length < maxStops && pool.length > 0) {
    const remaining = WORKDAY_MINUTES - totalDrive - totalAppt;
    const needForNext = APPOINTMENT_MINUTES + 30;
    if (remaining < needForNext) break;

    let bestIdx = -1;
    let bestScore = -Infinity;
    let bestDrive = 0;

    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (used.has(c.customer.id)) continue;
      const drive = estimateDriveMinutes(current, c.point);
      if (totalDrive + totalAppt + drive + APPOINTMENT_MINUTES > WORKDAY_MINUTES) {
        rejected += 1;
        continue;
      }
      const score = scoreCandidate(drive, c.customer, store);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
        bestDrive = drive;
      }
    }

    if (bestIdx < 0) break;

    const picked = pool[bestIdx];
    used.add(picked.customer.id);
    totalDrive += bestDrive;
    totalAppt += APPOINTMENT_MINUTES;
    stops.push({
      customer: picked.customer,
      point: picked.point,
      driveMinutesFromPrev: Math.round(bestDrive),
      cumulativeDriveMinutes: Math.round(totalDrive),
    });
    current = picked.point;
    pool.splice(bestIdx, 1);
  }

  return {
    origin,
    stops,
    totalDriveMinutes: Math.round(totalDrive),
    totalAppointmentMinutes: totalAppt,
    totalMinutes: Math.round(totalDrive + totalAppt),
    rejectedByTime: rejected,
  };
}

export function formatRouteDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
