import { addMinutes, format, parseISO } from 'date-fns';
import type { CustomerPriority, CustomerVisitStore } from '../types/customerPriority';
import type { SalesFunnelDeal } from '../types/salesFunnel';
import { isFunnelCalendarActivity } from './visitOutlookIntegrations';
import {
  applyRemoteScheduledVisits,
  getCustomerVisitUrgency,
  isNewCustomer,
  loadDismissedNewLeads,
  loadVisitStore,
  VISIT_STORE_CHANGED_EVENT,
} from './customerVisitStorage';
import { computeStopSchedules, loadPlannedRoutes, PLANNED_ROUTES_CHANGED_EVENT } from './plannedRoutesStorage';
import { loadAllFunnelDeals, SALES_FUNNEL_CHANGED_EVENT } from './salesFunnelStorage';
import { scheduleApiFetch } from './scheduleProposal';
import { hydrateSalesDataFromSupabase } from './salesSync';
import { loadOwnCalendarEntries, ownEntryToBusy, OWN_CALENDAR_CHANGED_EVENT } from './calendarBusyTimes';

export const TOOL_CALENDAR_SYNCED_KEY = 'pht_calendar_outlook_synced_v1';
export const TOOL_CALENDAR_CHANGED_EVENT = 'pht-tool-calendar-changed';
export const TOOL_CALENDAR_HIDDEN_KEY = 'pht_calendar_hidden_ids_v1';
export const TOOL_CALENDAR_SUPPRESSED_VISITS_KEY = 'pht_calendar_suppressed_visits_v1';

export type ToolCalendarKind =
  | 'confirmed'
  | 'pending'
  | 'wish'
  | 'tour'
  | 'funnel'
  | 'reminder'
  | 'deadline'
  | 'block';

export type ToolCalendarFilter = 'all' | ToolCalendarKind;

export interface ScheduleCalendarFeedItem {
  id: string;
  status: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  slot: {
    date?: string | null;
    startTime?: string | null;
    startIso?: string | null;
    endIso?: string | null;
  } | null;
  slots?: Array<{ date?: string; startTime?: string; startIso?: string | null }>;
  customRequest?: { dateFrom?: string; timeFrom?: string; startIso?: string } | null;
}

export interface ToolCalendarEvent {
  id: string;
  kind: ToolCalendarKind;
  title: string;
  subtitle?: string;
  date: string;
  start?: string;
  end?: string;
  location?: string;
  href?: string;
  customerId?: string;
  customerEmail?: string;
  outlookReady: boolean;
  ownId?: string;
}

export const KIND_LABEL: Record<ToolCalendarKind, string> = {
  confirmed: 'Bestätigt',
  pending: 'Vorschlag',
  wish: 'Wunschtermin',
  tour: 'Tour',
  funnel: 'Funnel',
  reminder: 'Erinnerung',
  deadline: 'Frist',
  block: 'Mein Termin',
};

export const KIND_DOT: Record<ToolCalendarKind, string> = {
  confirmed: 'bg-emerald-400',
  pending: 'bg-sky-400',
  wish: 'bg-amber-400',
  tour: 'bg-violet-400',
  funnel: 'bg-blue-400',
  reminder: 'bg-orange-400',
  deadline: 'bg-red-400',
  block: 'bg-slate-300',
};

export const KIND_CHIP: Record<ToolCalendarKind, string> = {
  confirmed: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  pending: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
  wish: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  tour: 'border-violet-500/40 text-violet-300 bg-violet-500/10',
  funnel: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
  reminder: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
  deadline: 'border-red-500/40 text-red-300 bg-red-500/10',
  block: 'border-slate-400/40 text-slate-200 bg-slate-500/15',
};

function addMinutesIso(iso: string, minutes: number): string {
  const normalized = iso.length === 16 ? `${iso}:00` : iso;
  try {
    return format(addMinutes(parseISO(normalized), minutes), "yyyy-MM-dd'T'HH:mm:ss");
  } catch {
    return iso;
  }
}

function timeFromIso(iso?: string | null): string {
  if (!iso) return '';
  const part = iso.split('T')[1];
  return part ? part.slice(0, 5) : '';
}

export function loadOutlookSyncedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TOOL_CALENDAR_SYNCED_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markOutlookSynced(ids: string[]): void {
  const next = loadOutlookSyncedIds();
  for (const id of ids) next.add(id);
  localStorage.setItem(TOOL_CALENDAR_SYNCED_KEY, JSON.stringify([...next]));
  window.dispatchEvent(new CustomEvent(TOOL_CALENDAR_CHANGED_EVENT));
}

export function isOutlookSynced(id: string, synced = loadOutlookSyncedIds()): boolean {
  return synced.has(id);
}

export function loadHiddenCalendarIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TOOL_CALENDAR_HIDDEN_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function hideCalendarEvent(id: string): void {
  const next = loadHiddenCalendarIds();
  next.add(id);
  localStorage.setItem(TOOL_CALENDAR_HIDDEN_KEY, JSON.stringify([...next]));
  window.dispatchEvent(new CustomEvent(TOOL_CALENDAR_CHANGED_EVENT));
}

export function loadSuppressedVisitKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(TOOL_CALENDAR_SUPPRESSED_VISITS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function suppressConfirmedVisit(customerId: string, scheduledVisit?: string): void {
  const next = loadSuppressedVisitKeys();
  next.add(customerId);
  if (scheduledVisit) next.add(`${customerId}|${scheduledVisit}`);
  localStorage.setItem(TOOL_CALENDAR_SUPPRESSED_VISITS_KEY, JSON.stringify([...next]));
}

export async function fetchScheduleCalendarFeed(): Promise<ScheduleCalendarFeedItem[]> {
  try {
    const res = await scheduleApiFetch('/api/schedule-calendar-feed');
    if (!res.ok) return [];
    const body = await res.json().catch(() => ({}));
    return Array.isArray(body.items) ? body.items : [];
  } catch {
    return [];
  }
}

export async function refreshCalendarFromServer(): Promise<ScheduleCalendarFeedItem[]> {
  await hydrateSalesDataFromSupabase();
  const items = await fetchScheduleCalendarFeed();
  const suppressed = loadSuppressedVisitKeys();
  applyRemoteScheduledVisits(
    items
      .filter((item) => item.status === 'confirmed' && item.customerId && item.slot?.startIso)
      .filter((item) => !suppressed.has(item.customerId) && !suppressed.has(`${item.customerId}|${item.slot!.startIso}`))
      .map((item) => ({
        customerId: item.customerId,
        scheduledVisit: item.slot!.startIso as string,
        notes: `Termin bestätigt (Kunde): ${item.customerName}`,
      })),
  );
  return items;
}

function eventsFromFeed(items: ScheduleCalendarFeedItem[], customers: CustomerPriority[]): ToolCalendarEvent[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const events: ToolCalendarEvent[] = [];

  for (const item of items) {
    const customer = byId.get(item.customerId);
    const location = customer ? `${customer.zip} ${customer.city}`.trim() : '';

    if (item.status === 'confirmed' && item.slot?.date) {
      const start = item.slot.startIso || `${item.slot.date}T${item.slot.startTime || '09:00'}:00`;
      events.push({
        id: `confirmed:${item.id}`,
        kind: 'confirmed',
        title: item.customerName,
        subtitle: `${timeFromIso(start) || item.slot.startTime || ''} Uhr · vom Kunden bestätigt`.trim(),
        date: item.slot.date,
        start,
        end: item.slot.endIso || addMinutesIso(start, 45),
        location,
        href: `/priorities?customer=${encodeURIComponent(item.customerId)}`,
        customerId: item.customerId,
        customerEmail: item.customerEmail ?? undefined,
        outlookReady: true,
      });
      continue;
    }

    if (item.status === 'custom_request') {
      const date = item.customRequest?.dateFrom || item.slot?.date;
      if (!date) continue;
      const time = item.customRequest?.timeFrom || item.slot?.startTime || '09:00';
      const start = item.customRequest?.startIso || `${date}T${time}:00`;
      events.push({
        id: `wish:${item.id}`,
        kind: 'wish',
        title: item.customerName,
        subtitle: `Wunschtermin ${time} Uhr – bitte prüfen`,
        date,
        start,
        end: addMinutesIso(start, 45),
        location,
        href: `/priorities?customer=${encodeURIComponent(item.customerId)}`,
        customerId: item.customerId,
        customerEmail: item.customerEmail ?? undefined,
        outlookReady: true,
      });
      continue;
    }

    if (item.status === 'pending') {
      const first = item.slots?.[0] || item.slot;
      const date = first?.date;
      if (!date) continue;
      const times = (item.slots ?? []).map((s) => s.startTime).filter(Boolean).slice(0, 5).join(', ');
      events.push({
        id: `pending:${item.id}`,
        kind: 'pending',
        title: item.customerName,
        subtitle: times ? `Vorschlag gesendet · ${times}` : 'Terminvorschlag offen',
        date,
        href: `/priorities?customer=${encodeURIComponent(item.customerId)}`,
        customerId: item.customerId,
        customerEmail: item.customerEmail ?? undefined,
        outlookReady: false,
      });
    }
  }
  return events;
}

function eventsFromVisits(customers: CustomerPriority[], store: CustomerVisitStore): ToolCalendarEvent[] {
  return customers.flatMap((customer) => {
    const state = store[customer.id];
    if (!state?.scheduledVisit || state.archived) return [];
    const date = state.scheduledVisit.slice(0, 10);
    const start = state.scheduledVisit.length > 10 ? state.scheduledVisit : `${date}T09:00:00`;
    return [{
      id: `visit:${customer.id}:${state.scheduledVisit}`,
      kind: 'confirmed' as const,
      title: customer.name,
      subtitle: `${timeFromIso(state.scheduledVisit)} Uhr · bestätigter Besuch`,
      date,
      start,
      end: addMinutesIso(start, 45),
      location: `${customer.zip} ${customer.city}`.trim(),
      href: `/priorities?customer=${encodeURIComponent(customer.id)}`,
      customerId: customer.id,
      outlookReady: true,
    }];
  });
}

function eventsFromTours(): ToolCalendarEvent[] {
  try {
    return loadPlannedRoutes().routes.flatMap((route) => {
      const schedules = computeStopSchedules(route);
      return route.stops.map((stop, i) => {
        const sched = schedules[i];
        const arrival = sched?.arrivalLabel || '09:00';
        const end = sched?.endLabel || '09:45';
        return {
          id: `tour:${route.id}:${stop.customerId}:${i}`,
          kind: 'tour' as const,
          title: stop.customerName,
          subtitle: `Tour-Stopp ${i + 1}/${route.stops.length}${sched?.slotLabel ? ` · ${sched.slotLabel}` : ''}`,
          date: route.date,
          start: stop.scheduledStartIso || `${route.date}T${arrival}:00`,
          end: stop.scheduledEndIso || `${route.date}T${end}:00`,
          location: `${stop.zip} ${stop.city}`.trim(),
          href: `/priorities?customer=${encodeURIComponent(stop.customerId)}`,
          customerId: stop.customerId,
          outlookReady: true,
        };
      });
    });
  } catch (err) {
    console.error('[toolCalendar] tours', err);
    return [];
  }
}

function eventsFromFunnel(deals: SalesFunnelDeal[]): ToolCalendarEvent[] {
  const events: ToolCalendarEvent[] = [];
  const seen = new Set<string>();
  for (const deal of deals) {
    if (deal.status === 'Verloren' || deal.status === 'Gewonnen') continue;
    if (deal.followUpUntil) {
      const time = deal.followUpTime || '09:00';
      const start = `${deal.followUpUntil}T${time}:00`;
      const id = `funnel:${deal.id}:followup:${deal.followUpUntil}`;
      seen.add(id);
      events.push({
        id,
        kind: 'funnel',
        title: deal.customer,
        subtitle: `Nachfassen${deal.project ? ` · ${deal.project}` : ''}`,
        date: deal.followUpUntil,
        start,
        end: addMinutesIso(start, 30),
        location: [deal.city, deal.country].filter(Boolean).join(', '),
        href: '/sales-funnel',
        customerId: deal.customerId,
        outlookReady: true,
      });
    }
    for (const activity of deal.activities ?? []) {
      if (!activity.date || !isFunnelCalendarActivity(activity.type)) continue;
      const id = `funnel:${deal.id}:${activity.type}:${activity.date}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const start = `${activity.date}T${activity.type === 'Termin' ? '10:00' : '09:00'}:00`;
      events.push({
        id,
        kind: 'funnel',
        title: deal.customer,
        subtitle: activity.type,
        date: activity.date,
        start,
        end: addMinutesIso(start, activity.type === 'Termin' ? 45 : 30),
        location: [deal.city, deal.country].filter(Boolean).join(', '),
        href: '/sales-funnel',
        customerId: deal.customerId,
        outlookReady: true,
      });
    }
  }
  return events;
}

function eventsFromLeadReminders(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
  monthStart: string,
  monthEnd: string,
): ToolCalendarEvent[] {
  const dismissed = loadDismissedNewLeads();
  const events: ToolCalendarEvent[] = [];
  for (const customer of customers) {
    const state = store[customer.id];
    if (state?.archived || state?.scheduledVisit) continue;
    const due = state?.nextDue;
    if (due && due >= monthStart && due <= monthEnd) {
      const urgency = getCustomerVisitUrgency(customer, store);
      if (urgency === 'due_soon' || (urgency === 'overdue' && state?.lastVisit)) {
        events.push({
          id: `reminder-due:${customer.id}:${due}`,
          kind: 'reminder',
          title: customer.name,
          subtitle: urgency === 'overdue' ? 'Besuch überfällig' : 'Besuch fällig',
          date: due,
          location: `${customer.zip} ${customer.city}`.trim(),
          href: `/priorities?customer=${encodeURIComponent(customer.id)}`,
          customerId: customer.id,
          outlookReady: true,
          start: `${due}T09:00:00`,
          end: `${due}T09:30:00`,
        });
      }
    }
    if (isNewCustomer(customer, store, dismissed) && customer.discoveredAt) {
      const date = customer.discoveredAt.slice(0, 10);
      if (date >= monthStart && date <= monthEnd) {
        events.push({
          id: `reminder-lead:${customer.id}:${date}`,
          kind: 'reminder',
          title: customer.name,
          subtitle: 'Neuer Lead – Erstbesuch planen',
          date,
          location: `${customer.zip} ${customer.city}`.trim(),
          href: `/priorities?customer=${encodeURIComponent(customer.id)}`,
          customerId: customer.id,
          outlookReady: true,
          start: `${date}T08:30:00`,
          end: `${date}T09:00:00`,
        });
      }
    }
  }
  return events;
}

function eventsFromOwnEntries(): ToolCalendarEvent[] {
  return loadOwnCalendarEntries().map((entry) => {
    const busy = ownEntryToBusy(entry);
    return {
      id: `block:${entry.id}`,
      kind: 'block' as const,
      title: entry.title,
      subtitle: entry.allDay ? 'Ganzer Tag · keine Tour' : `${entry.startTime}–${entry.endTime} Uhr · keine Tour`,
      date: entry.date,
      start: busy.start,
      end: busy.end,
      outlookReady: false,
      ownId: entry.id,
    };
  });
}

export function collectToolCalendarEvents(opts: {
  customers: CustomerPriority[];
  feed: ScheduleCalendarFeedItem[];
  monthStart?: string;
  monthEnd?: string;
}): ToolCalendarEvent[] {
  try {
    const store = loadVisitStore();
    const feedEvents = eventsFromFeed(opts.feed, opts.customers);
    const confirmedKeys = new Set(
      feedEvents.filter((e) => e.kind === 'confirmed' && e.customerId).map((e) => `${e.customerId}:${e.date}`),
    );
    const visitEvents = eventsFromVisits(opts.customers, store).filter((e) => {
      if (!e.customerId) return true;
      return !confirmedKeys.has(`${e.customerId}:${e.date}`);
    });
    const monthStart = opts.monthStart ?? '0000-01-01';
    const monthEnd = opts.monthEnd ?? '9999-12-31';
    const seen = new Set<string>();
    const hidden = loadHiddenCalendarIds();
    return [
      ...eventsFromOwnEntries(),
      ...feedEvents,
      ...visitEvents,
      ...eventsFromTours(),
      ...eventsFromFunnel(loadAllFunnelDeals()),
      ...eventsFromLeadReminders(opts.customers, store, monthStart, monthEnd),
    ]
      .filter((e) => {
        if (hidden.has(e.id)) return false;
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .sort((a, b) => (a.start ?? a.date).localeCompare(b.start ?? b.date));
  } catch (err) {
    console.error('[toolCalendar] collect', err);
    return [];
  }
}

export function groupEventsByDate(events: ToolCalendarEvent[]): Map<string, ToolCalendarEvent[]> {
  const map = new Map<string, ToolCalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return map;
}

export { VISIT_STORE_CHANGED_EVENT, PLANNED_ROUTES_CHANGED_EVENT, SALES_FUNNEL_CHANGED_EVENT, OWN_CALENDAR_CHANGED_EVENT };
