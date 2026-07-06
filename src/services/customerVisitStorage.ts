import { addMonths, differenceInDays, format, parseISO } from 'date-fns';
import { inferBundesland } from '../lib/bundeslandFromPlz';
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

export function filterCustomers(
  customers: CustomerPriority[],
  opts: {
    priority?: VisitPriority | 'all';
    sector?: string;
    owner?: string;
    search?: string;
    hideMeat?: boolean;
    bundeslaender?: string[];
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
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.sectorLabel.toLowerCase().includes(q) ||
        (resolveBundesland(c)?.toLowerCase().includes(q) ?? false),
    );
  }
  return list;
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
