import {
  addMonths, differenceInDays, endOfMonth, format, isWithinInterval, parseISO, startOfMonth,
} from 'date-fns';
import { inferBundesland, AT_BUNDESLAND_ORDER } from '../lib/bundeslandFromPlz';
import type { CustomerPriority, CustomerPrioritiesData, CustomerVisitState, CustomerVisitStore, VisitPriority } from '../types/customerPriority';

const STORAGE_KEY = 'pht_customer_visit_state_v1';

export const VISIT_CADENCE_LABEL: Record<VisitPriority, string> = {
  A: 'monatlich',
  B: 'quartalsweise',
  C: 'halbjährlich',
};

export function loadVisitStore(): CustomerVisitStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CustomerVisitStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveVisitStore(store: CustomerVisitStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded
  }
}

export function getVisitState(customerId: string): CustomerVisitState {
  const store = loadVisitStore();
  return store[customerId] ?? { lastVisit: null, nextDue: null, notes: '' };
}

export function recordVisit(customerId: string, cadenceMonths: number, date = new Date()): CustomerVisitState {
  const store = loadVisitStore();
  const lastVisit = format(date, 'yyyy-MM-dd');
  const nextDue = format(addMonths(date, cadenceMonths), 'yyyy-MM-dd');
  const state: CustomerVisitState = {
    ...getVisitState(customerId),
    lastVisit,
    nextDue,
  };
  store[customerId] = state;
  saveVisitStore(store);
  return state;
}

export function updateVisitNotes(customerId: string, notes: string): void {
  const store = loadVisitStore();
  store[customerId] = { ...getVisitState(customerId), notes };
  saveVisitStore(store);
}

export type VisitUrgency = 'overdue' | 'due_soon' | 'ok' | 'none';

export function getVisitUrgency(nextDue: string | null, today = new Date()): VisitUrgency {
  if (!nextDue) return 'none';
  const days = differenceInDays(parseISO(nextDue), today);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due_soon';
  return 'ok';
}

export function getDaysUntilDue(nextDue: string | null, today = new Date()): number | null {
  if (!nextDue) return null;
  return differenceInDays(parseISO(nextDue), today);
}

export async function fetchCustomerPriorities(): Promise<CustomerPrioritiesData | null> {
  try {
    const res = await fetch('/data/customer-priorities.json');
    if (!res.ok) return null;
    return (await res.json()) as CustomerPrioritiesData;
  } catch {
    return null;
  }
}

export function resolveBundesland(customer: CustomerPriority): string | null {
  if (customer.bundesland) return customer.bundesland;
  return inferBundesland(customer.zip, customer.country, customer.city);
}

export type PriorityCounts = { A: number; B: number; C: number };

export function countPriorities(customers: CustomerPriority[]): PriorityCounts {
  const counts: PriorityCounts = { A: 0, B: 0, C: 0 };
  for (const c of customers) counts[c.priority] += 1;
  return counts;
}

export function formatPriorityCounts(counts: PriorityCounts): string {
  return `${counts.A} A · ${counts.B} B · ${counts.C} C`;
}

export function uniqueBundeslaender(
  customers: CustomerPriority[],
): { name: string; count: number; priorities: PriorityCounts }[] {
  const map = new Map<string, { count: number; priorities: PriorityCounts }>();
  for (const c of customers) {
    const bl = resolveBundesland(c);
    if (!bl) continue;
    const entry = map.get(bl) ?? { count: 0, priorities: { A: 0, B: 0, C: 0 } };
    entry.count += 1;
    entry.priorities[c.priority] += 1;
    map.set(bl, entry);
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
}

export function uniqueSectors(customers: CustomerPriority[]): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const c of customers) map.set(c.sector, c.sectorLabel);
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

export function countDueVisits(customers: CustomerPriority[], store: CustomerVisitStore): number {
  return customers.filter((c) => {
    const urgency = getVisitUrgency(store[c.id]?.nextDue ?? null);
    return urgency === 'overdue' || urgency === 'due_soon';
  }).length;
}

export function countOverdueVisits(customers: CustomerPriority[], store: CustomerVisitStore): number {
  return customers.filter((c) => getVisitUrgency(store[c.id]?.nextDue ?? null) === 'overdue').length;
}

const PRIORITY_RANK: Record<VisitPriority, number> = { A: 0, B: 1, C: 2 };

export function sortByNextVisit(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
): CustomerPriority[] {
  return [...customers].sort((a, b) => {
    const na = store[a.id]?.nextDue ?? null;
    const nb = store[b.id]?.nextDue ?? null;
    const ua = getVisitUrgency(na);
    const ub = getVisitUrgency(nb);
    const da = getDaysUntilDue(na);
    const db = getDaysUntilDue(nb);
    const aOver = ua === 'overdue';
    const bOver = ub === 'overdue';
    if (aOver !== bOver) return aOver ? -1 : 1;
    if (aOver && bOver) {
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      }
      return (da ?? 0) - (db ?? 0);
    }
    if (!na && nb) return 1;
    if (na && !nb) return -1;
    if (na && nb && na !== nb) return na.localeCompare(nb);
    return b.potentialScore - a.potentialScore;
  });
}

export interface BundeslandOverview {
  name: string;
  count: number;
  priorities: PriorityCounts;
  overdue: number;
}

export function computeBundeslandOverview(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
): BundeslandOverview[] {
  const map = new Map<string, BundeslandOverview>();
  for (const c of customers) {
    const bl = resolveBundesland(c);
    if (!bl) continue;
    const entry = map.get(bl) ?? {
      name: bl,
      count: 0,
      priorities: { A: 0, B: 0, C: 0 },
      overdue: 0,
    };
    entry.count += 1;
    entry.priorities[c.priority] += 1;
    if (getVisitUrgency(store[c.id]?.nextDue ?? null) === 'overdue') entry.overdue += 1;
    map.set(bl, entry);
  }
  return [...map.values()].sort((a, b) => {
    const at = AT_BUNDESLAND_ORDER.indexOf(a.name);
    const bt = AT_BUNDESLAND_ORDER.indexOf(b.name);
    if (at >= 0 && bt >= 0) return at - bt;
    if (at >= 0) return -1;
    if (bt >= 0) return 1;
    return a.name.localeCompare(b.name, 'de');
  });
}

export interface VisitDashboardKpis {
  overdue: number;
  aDueThisMonth: number;
  visitsThisWeek: number;
}

export function computeVisitDashboardKpis(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
  today = new Date(),
): VisitDashboardKpis {
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const weekAgo = format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  let overdue = 0;
  let aDueThisMonth = 0;
  for (const c of customers) {
    const nextDue = store[c.id]?.nextDue ?? null;
    const urgency = getVisitUrgency(nextDue, today);
    if (urgency === 'overdue') overdue += 1;
    if (c.priority === 'A' && nextDue) {
      const due = parseISO(nextDue);
      if (
        urgency === 'overdue'
        || isWithinInterval(due, { start: monthStart, end: monthEnd })
      ) {
        aDueThisMonth += 1;
      }
    }
  }

  let visitsThisWeek = 0;
  for (const state of Object.values(store)) {
    if (state.lastVisit && state.lastVisit >= weekAgo) visitsThisWeek += 1;
  }

  return { overdue, aDueThisMonth, visitsThisWeek };
}

export type QuickFilter = 'overdue' | 'a' | 'research' | 'week';

export function filterCustomers(
  customers: CustomerPriority[],
  opts: {
    priority?: VisitPriority | 'all';
    sector?: string;
    owner?: string;
    search?: string;
    hideMeat?: boolean;
    bundeslaender?: string[];
    quickFilter?: QuickFilter | null;
    store?: CustomerVisitStore;
  },
): CustomerPriority[] {
  let list = customers;
  if (opts.priority && opts.priority !== 'all') {
    list = list.filter((c) => c.priority === opts.priority);
  }
  if (opts.sector && opts.sector !== 'all') {
    list = list.filter((c) => c.sector === opts.sector);
  }
  if (opts.owner) {
    list = list.filter((c) => c.owner === opts.owner);
  }
  if (opts.hideMeat) {
    list = list.filter((c) => !c.isMeatIndustry);
  }
  if (opts.bundeslaender && opts.bundeslaender.length > 0) {
    const selected = new Set(opts.bundeslaender);
    list = list.filter((c) => {
      const bl = resolveBundesland(c);
      return bl != null && selected.has(bl);
    });
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q)
        || c.city.toLowerCase().includes(q)
        || c.sectorLabel.toLowerCase().includes(q)
        || (resolveBundesland(c)?.toLowerCase().includes(q) ?? false),
    );
  }
  if (opts.quickFilter && opts.store) {
    const store = opts.store;
    const today = new Date();
    if (opts.quickFilter === 'overdue') {
      list = list.filter((c) => getVisitUrgency(store[c.id]?.nextDue ?? null) === 'overdue');
    } else if (opts.quickFilter === 'a') {
      list = list.filter((c) => c.priority === 'A');
    } else if (opts.quickFilter === 'research') {
      list = list.filter((c) => c.source === 'research');
    } else if (opts.quickFilter === 'week') {
      const weekEnd = format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      list = list.filter((c) => {
        const nd = store[c.id]?.nextDue;
        return nd != null && nd >= todayStr && nd <= weekEnd;
      });
    }
  }
  return list;
}

export function exportTourListCsv(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
  filename = 'tourliste.csv',
): void {
  const headers = [
    'Name', 'PLZ', 'Ort', 'Bundesland', 'Prio', 'Potenzial',
    'Nächster Besuch', 'Letzter Besuch', 'Status', 'Branche', 'Notizen',
  ];
  const rows = customers.map((c) => {
    const visit = store[c.id] ?? { lastVisit: null, nextDue: null, notes: '' };
    const urgency = getVisitUrgency(visit.nextDue);
    const status = URGENCY_LABEL_EXPORT[urgency];
    const bl = resolveBundesland(c) ?? '';
    return [
      c.name, c.zip, c.city, bl, c.priority, String(c.potentialScore),
      visit.nextDue ?? '', visit.lastVisit ?? '', status, c.sectorLabel, visit.notes,
    ];
  });
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const URGENCY_LABEL_EXPORT: Record<VisitUrgency, string> = {
  overdue: 'überfällig',
  due_soon: 'bald fällig',
  ok: 'im Plan',
  none: 'kein Termin',
};

export const OVERDUE_BANNER_KEY = 'pht_priorities_overdue_banner_dismissed';

export async function fetchOverdueCountForOwner(owner = 'Dominik Weller'): Promise<number> {
  const data = await fetchCustomerPriorities();
  if (!data) return 0;
  const store = loadVisitStore();
  const owned = data.customers.filter((c) => c.owner === owner);
  return countOverdueVisits(owned, store);
}
