import type { CustomerPriority, CustomerVisitStore } from '../types/customerPriority';
import type { CustomerGeocodesFile } from './customerGeocodes';
import { getCustomerPoint } from './customerGeocodes';
import {
  getCustomerVisitUrgency,
  type VisitUrgency,
} from './customerVisitStorage';
import { haversineKm } from '../lib/geo/routePlanning';

export const DEFAULT_RADIUS_KM = 30;
export const ROUTE_DAY_STOP_COUNT = 6;

export interface NearbyCustomer {
  customer: CustomerPriority;
  distanceKm: number;
  urgency: VisitUrgency;
}

const PRIO_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

function urgencyRank(urgency: VisitUrgency): number {
  if (urgency === 'overdue') return 0;
  if (urgency === 'due_soon') return 1;
  return 2;
}

function compareNearby(a: NearbyCustomer, b: NearbyCustomer): number {
  const pr = (PRIO_RANK[a.customer.priority] ?? 9) - (PRIO_RANK[b.customer.priority] ?? 9);
  if (pr !== 0) return pr;
  if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
  return urgencyRank(a.urgency) - urgencyRank(b.urgency);
}

export function findNearbyCustomers(
  anchor: CustomerPriority,
  allCustomers: CustomerPriority[],
  geocodes: CustomerGeocodesFile | null,
  store: CustomerVisitStore,
  options: {
    radiusKm?: number;
    excludeIds?: Set<string>;
    onlyDue?: boolean;
    limit?: number;
  } = {},
): NearbyCustomer[] {
  const radius = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const limit = options.limit ?? ROUTE_DAY_STOP_COUNT;
  const anchorPoint = getCustomerPoint(geocodes, anchor.id, anchor.zip, anchor.city, anchor.country);
  if (!anchorPoint) return [];

  const exclude = new Set<string>([anchor.id, ...(options.excludeIds ? [...options.excludeIds] : [])]);

  const results: NearbyCustomer[] = [];
  for (const customer of allCustomers) {
    if (exclude.has(customer.id)) continue;
    const point = getCustomerPoint(geocodes, customer.id, customer.zip, customer.city, customer.country);
    if (!point) continue;
    const distanceKm = haversineKm(anchorPoint, point);
    if (distanceKm > radius) continue;
    const urgency = getCustomerVisitUrgency(customer, store);
    if (options.onlyDue && urgency !== 'overdue' && urgency !== 'due_soon') continue;
    results.push({ customer, distanceKm, urgency });
  }

  results.sort(compareNearby);
  return results.slice(0, limit);
}

/** Pick the day (from slot dates) with the most nearby due customers. */
export function pickBestRouteDay(
  anchor: CustomerPriority,
  slotDates: string[],
  allCustomers: CustomerPriority[],
  geocodes: CustomerGeocodesFile | null,
  store: CustomerVisitStore,
): { date: string; customers: NearbyCustomer[] } | null {
  if (!slotDates.length) return null;

  let best: { date: string; customers: NearbyCustomer[] } | null = null;
  for (const date of [...new Set(slotDates)]) {
    const nearby = findNearbyCustomers(anchor, allCustomers, geocodes, store, {
      onlyDue: true,
      limit: ROUTE_DAY_STOP_COUNT,
    });
    if (!nearby.length) continue;
    if (!best || nearby.length > best.customers.length) {
      best = { date, customers: nearby };
    }
  }

  return best;
}

export function formatDistanceKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export interface RegionalDayNote {
  date: string;
  dateLabel: string;
  nearbyNames: string[];
}

export function buildRegionalDayNotes(
  anchor: CustomerPriority,
  slotDates: string[],
  allCustomers: CustomerPriority[],
  geocodes: CustomerGeocodesFile | null,
  store: CustomerVisitStore,
): RegionalDayNote[] {
  const uniqueDates = [...new Set(slotDates)];
  const notes: RegionalDayNote[] = [];

  for (const date of uniqueDates) {
    const nearby = findNearbyCustomers(anchor, allCustomers, geocodes, store, {
      onlyDue: true,
      limit: 4,
    });
    if (nearby.length === 0) continue;
    const [y, m, d] = date.split('-');
    notes.push({
      date,
      dateLabel: `${d}.${m}.${y}`,
      nearbyNames: nearby.map((n) => n.customer.name),
    });
  }

  return notes;
}
