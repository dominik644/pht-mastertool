import type { VisitPriority } from '../types/customerPriority';
import type { HomeBase } from '../lib/territoryConfig';
import { loadHomeBase } from '../lib/territoryConfig';
import type { RoutePlan } from '../lib/geo/routePlanning';
import {
  APPOINTMENT_MINUTES, haversineKm, ROAD_FACTOR,
} from '../lib/geo/routePlanning';

export const PLANNED_ROUTES_STORAGE_KEY = 'pht-planned-routes';
export const PLANNED_ROUTES_CHANGED_EVENT = 'pht-planned-routes-changed';

export interface PlannedRouteStop {
  customerId: string;
  customerName: string;
  zip: string;
  city: string;
  priority: VisitPriority;
  driveMinutesFromPrev: number;
  lat: number;
  lng: number;
  visitCadenceMonths?: number;
}

export interface PlannedRoute {
  id: string;
  date: string;
  homeBase: HomeBase;
  stops: PlannedRouteStop[];
  adoptedAt: string;
  territory?: string;
}

export interface PlannedRoutesStore {
  routes: PlannedRoute[];
}

const WORKDAY_START_MINUTES = 8 * 60;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function newId(): string {
  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadPlannedRoutes(): PlannedRoutesStore {
  try {
    const raw = localStorage.getItem(PLANNED_ROUTES_STORAGE_KEY);
    if (!raw) return { routes: [] };
    const parsed = JSON.parse(raw) as PlannedRoutesStore;
    if (!Array.isArray(parsed.routes)) return { routes: [] };
    return { routes: parsed.routes };
  } catch {
    return { routes: [] };
  }
}

export function savePlannedRoutes(store: PlannedRoutesStore): void {
  localStorage.setItem(PLANNED_ROUTES_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(PLANNED_ROUTES_CHANGED_EVENT));
}

export function routePlanToPlannedRoute(
  plan: RoutePlan,
  date: string,
  homeBase: HomeBase = loadHomeBase(),
  territory?: string,
): PlannedRoute {
  return {
    id: newId(),
    date,
    homeBase,
    adoptedAt: new Date().toISOString(),
    territory,
    stops: plan.stops.map((s) => ({
      customerId: s.customer.id,
      customerName: s.customer.name,
      zip: s.customer.zip,
      city: s.customer.city,
      priority: s.customer.priority,
      driveMinutesFromPrev: s.driveMinutesFromPrev,
      lat: s.point.lat,
      lng: s.point.lng,
      visitCadenceMonths: s.customer.visitCadenceMonths,
    })),
  };
}

export function adoptRouteForDate(
  plan: RoutePlan,
  date: string,
  homeBase?: HomeBase,
  territory?: string,
): PlannedRoute {
  const store = loadPlannedRoutes();
  const route = routePlanToPlannedRoute(plan, date, homeBase, territory);
  store.routes = store.routes.filter((r) => r.date !== date);
  store.routes.push(route);
  savePlannedRoutes(store);
  return route;
}

export function adoptRouteForToday(
  plan: RoutePlan,
  homeBase?: HomeBase,
  territory?: string,
): PlannedRoute {
  return adoptRouteForDate(plan, todayIso(), homeBase, territory);
}

export function removePlannedRoute(id: string): void {
  const store = loadPlannedRoutes();
  store.routes = store.routes.filter((r) => r.id !== id);
  savePlannedRoutes(store);
}

export function moveRouteToDate(routeId: string, newDate: string): void {
  const store = loadPlannedRoutes();
  const route = store.routes.find((r) => r.id === routeId);
  if (!route) return;
  store.routes = store.routes.filter((r) => r.id !== routeId && r.date !== newDate);
  route.date = newDate;
  store.routes.push(route);
  savePlannedRoutes(store);
}

export function getRouteForDate(date: string): PlannedRoute | null {
  return loadPlannedRoutes().routes.find((r) => r.date === date) ?? null;
}

export function getWeekDates(ref = new Date()): string[] {
  const d = new Date(ref);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const wd = new Date(monday);
    wd.setDate(monday.getDate() + i);
    dates.push(wd.toISOString().slice(0, 10));
  }
  return dates;
}

export function formatMinutesAsTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface StopSchedule {
  arrivalMinutes: number;
  endMinutes: number;
  arrivalLabel: string;
  endLabel: string;
  slotLabel: string;
}

export function computeStopSchedules(route: PlannedRoute): StopSchedule[] {
  let cursor = WORKDAY_START_MINUTES;
  return route.stops.map((stop) => {
    cursor += stop.driveMinutesFromPrev;
    const arrival = cursor;
    const end = cursor + APPOINTMENT_MINUTES;
    cursor = end;
    return {
      arrivalMinutes: arrival,
      endMinutes: end,
      arrivalLabel: formatMinutesAsTime(arrival),
      endLabel: formatMinutesAsTime(end),
      slotLabel: `${formatMinutesAsTime(arrival)} – ${formatMinutesAsTime(end)}`,
    };
  });
}

export function estimateRouteKm(route: PlannedRoute): number {
  if (route.stops.length === 0) return 0;
  let total = 0;
  let prev = { lat: route.homeBase.lat, lng: route.homeBase.lng };
  for (const stop of route.stops) {
    total += haversineKm(prev, { lat: stop.lat, lng: stop.lng }) * ROAD_FACTOR;
    prev = { lat: stop.lat, lng: stop.lng };
  }
  total += haversineKm(prev, { lat: route.homeBase.lat, lng: route.homeBase.lng }) * ROAD_FACTOR;
  return Math.round(total);
}

export function weekdayLabel(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  return d.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' });
}
