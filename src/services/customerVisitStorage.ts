import {
  addDays, addMonths, differenceInDays, endOfMonth, format, isWithinInterval, parseISO, startOfMonth,
} from 'date-fns';
import { inferBundesland, AT_BUNDESLAND_ORDER } from '../lib/bundeslandFromPlz';
import { applyEffectivePriorities, getEffectivePriority } from './customerPriorityOverrides';
import { effectiveLieferadresse, formatAddressLine, getCustomerDetails } from './customerDetailsStorage';
import type { CustomerPriority, CustomerPrioritiesData, CustomerVisitState, CustomerVisitStore, VisitPriority } from '../types/customerPriority';

const STORAGE_KEY = 'pht_customer_visit_state_v1';
const MIGRATION_KEY = 'pht_customer_visit_migration_v5';
const DISMISSED_NEW_LEADS_KEY = 'pht_dismissed_new_leads_v1';

/** First due date for customers never visited – not the recurring visit cadence. */
export const INITIAL_DUE_MONTHS: Record<VisitPriority, number> = {
  A: 6,
  B: 12,
  C: 18,
};

export const VISIT_CADENCE_MONTHS: Record<VisitPriority, number> = {
  A: 6,
  B: 12,
  C: 18,
};

export const VISIT_CADENCE_LABEL: Record<VisitPriority, string> = {
  A: 'alle 6 Monate',
  B: 'alle 12 Monate',
  C: 'alle 18 Monate',
};

export function resolveCadenceMonths(customer: CustomerPriority): number {
  return VISIT_CADENCE_MONTHS[getEffectivePriority(customer)];
}

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

const DEFAULT_VISIT_STATE: CustomerVisitState = {
  lastVisit: null,
  nextDue: null,
  notes: '',
  archived: false,
};

export function getVisitState(customerId: string): CustomerVisitState {
  const store = loadVisitStore();
  return { ...DEFAULT_VISIT_STATE, ...store[customerId] };
}

export function isCustomerArchived(customerId: string): boolean {
  return getVisitState(customerId).archived === true;
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
  dismissNewLead(customerId);
  return state;
}

export function updateVisitNotes(customerId: string, notes: string): void {
  const store = loadVisitStore();
  store[customerId] = { ...getVisitState(customerId), notes };
  saveVisitStore(store);
}

/** Verschiebt den nächsten Termin ohne Besuch zu zählen (Snooze). Bei A ohne Besuch → nicht mehr überfällig bis Fälligkeit. */
export function skipVisit(customerId: string, cadenceMonths: number, today = new Date()): CustomerVisitState {
  const store = loadVisitStore();
  const current = getVisitState(customerId);
  const base = current.nextDue && differenceInDays(parseISO(current.nextDue), today) >= 0
    ? parseISO(current.nextDue)
    : today;
  const nextDue = format(addMonths(base, cadenceMonths), 'yyyy-MM-dd');
  const state: CustomerVisitState = { ...current, nextDue };
  store[customerId] = state;
  saveVisitStore(store);
  return state;
}

export function setCustomerArchived(customerId: string, archived: boolean): void {
  const store = loadVisitStore();
  store[customerId] = { ...getVisitState(customerId), archived };
  saveVisitStore(store);
}

const NEW_LEAD_WINDOW_DAYS = 30;

export function loadDismissedNewLeads(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_NEW_LEADS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function dismissNewLead(customerId: string): void {
  const dismissed = loadDismissedNewLeads();
  dismissed.add(customerId);
  try {
    localStorage.setItem(DISMISSED_NEW_LEADS_KEY, JSON.stringify([...dismissed]));
  } catch {
    // quota
  }
}

/** Neu entdeckt: isNewLead oder discoveredAt <30 Tage, noch kein Besuch, nicht dismissed */
export function isNewCustomer(
  customer: CustomerPriority,
  store: CustomerVisitStore = loadVisitStore(),
  dismissed: Set<string> = loadDismissedNewLeads(),
): boolean {
  if (dismissed.has(customer.id)) return false;
  const visit = store[customer.id];
  if (visit?.lastVisit) return false;
  if (customer.isNewLead) return true;
  if (customer.discoveredAt) {
    const days = differenceInDays(new Date(), parseISO(customer.discoveredAt));
    return days >= 0 && days <= NEW_LEAD_WINDOW_DAYS;
  }
  return false;
}

export type VisitUrgency = 'overdue' | 'due_soon' | 'ok' | 'planning' | 'none';

function overdueInitialDue(today = new Date()): string {
  return format(addDays(today, -1), 'yyyy-MM-dd');
}

function initialNextDue(priority: VisitPriority, today = new Date()): string {
  if (priority === 'A') return overdueInitialDue(today);
  return format(addMonths(today, INITIAL_DUE_MONTHS[priority]), 'yyyy-MM-dd');
}

/** Unvisited A → overdue; visited customers → date-based urgency. */
export function getVisitUrgency(
  nextDue: string | null,
  today = new Date(),
  lastVisit: string | null = null,
  priority?: VisitPriority,
): VisitUrgency {
  if (priority === 'A' && !lastVisit) return 'overdue';
  if (!nextDue && !lastVisit) return 'planning';
  if (!nextDue) return 'none';
  const days = differenceInDays(parseISO(nextDue), today);
  if (!lastVisit) {
    if (days < 0) return 'planning';
    if (days <= 7) return 'due_soon';
    return 'ok';
  }
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due_soon';
  return 'ok';
}

export function getCustomerVisitUrgency(
  customer: CustomerPriority,
  store?: CustomerVisitStore,
  today = new Date(),
): VisitUrgency {
  const state = (store ?? loadVisitStore())[customer.id];
  return getVisitUrgency(
    state?.nextDue ?? null,
    today,
    state?.lastVisit ?? null,
    customer.priority,
  );
}

function visitStateFields(existing: CustomerVisitState | undefined) {
  return {
    notes: existing?.notes ?? '',
    archived: existing?.archived ?? false,
  };
}

/** Setzt für nie besuchte Kunden nextDue auf heute + Intervall; korrigiert veraltete Daten. */
export function migrateVisitStore(customers: CustomerPriority[], today = new Date()): CustomerVisitStore {
  const store = loadVisitStore();
  let changed = false;

  for (const c of customers) {
    const existing = store[c.id];
    const lastVisit = existing?.lastVisit ?? null;
    const nextDue = existing?.nextDue ?? null;
    const extra = visitStateFields(existing);

    if (lastVisit) continue;

    const prio = getEffectivePriority(c);

    if (prio === 'A') {
      const daysUntil = nextDue ? differenceInDays(parseISO(nextDue), today) : -1;
      if (!nextDue || daysUntil >= 0) {
        store[c.id] = { lastVisit: null, nextDue: overdueInitialDue(today), ...extra };
        changed = true;
      }
      continue;
    }

    const needsInit = !nextDue;
    const isStalePast = nextDue != null && differenceInDays(parseISO(nextDue), today) < 0;
    if (needsInit || isStalePast) {
      store[c.id] = { lastVisit: null, nextDue: initialNextDue(prio, today), ...extra };
      changed = true;
    }
  }

  if (changed) saveVisitStore(store);
  try {
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch {
    // ignore
  }
  return store;
}

/** Fälligkeit neu berechnen: aus lastVisit + Kadenz, sonst Planungshorizont. */
export function recalculateDueDates(customers: CustomerPriority[], today = new Date()): CustomerVisitStore {
  const store = loadVisitStore();
  for (const c of customers) {
    const existing = store[c.id] ?? { lastVisit: null, nextDue: null, notes: '' };
    const cadence = VISIT_CADENCE_MONTHS[getEffectivePriority(c)];
    if (existing.lastVisit) {
      store[c.id] = {
        ...existing,
        nextDue: format(addMonths(parseISO(existing.lastVisit), cadence), 'yyyy-MM-dd'),
      };
    } else if (getEffectivePriority(c) === 'A') {
      store[c.id] = {
        ...existing,
        nextDue: overdueInitialDue(today),
      };
    } else {
      store[c.id] = {
        ...existing,
        nextDue: initialNextDue(getEffectivePriority(c), today),
      };
    }
  }
  saveVisitStore(store);
  return store;
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
    const urgency = getCustomerVisitUrgency(c, store);
    return urgency === 'overdue' || urgency === 'due_soon';
  }).length;
}

export function countOverdueVisits(customers: CustomerPriority[], store: CustomerVisitStore): number {
  return customers.filter((c) => getCustomerVisitUrgency(c, store) === 'overdue').length;
}

const PRIORITY_RANK: Record<VisitPriority, number> = { A: 0, B: 1, C: 2 };

export function sortByNextVisit(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
): CustomerPriority[] {
  return [...customers].sort((a, b) => {
    const sa = store[a.id];
    const sb = store[b.id];
    const na = sa?.nextDue ?? null;
    const nb = sb?.nextDue ?? null;
    const ua = getCustomerVisitUrgency(a, store);
    const ub = getCustomerVisitUrgency(b, store);
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
    if (getCustomerVisitUrgency(c, store) === 'overdue') entry.overdue += 1;
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
    const state = store[c.id];
    const nextDue = state?.nextDue ?? null;
    const urgency = getCustomerVisitUrgency(c, store, today);
    if (urgency === 'overdue') overdue += 1;
    const prio = getEffectivePriority(c);
    if (prio === 'A' && nextDue) {
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

export type QuickFilter = 'overdue' | 'a' | 'research' | 'week' | 'new';

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
    showArchived?: boolean;
  },
): CustomerPriority[] {
  let list = customers;
  if (opts.store && !opts.showArchived) {
    const store = opts.store;
    list = list.filter((c) => !store[c.id]?.archived);
  }
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
      list = list.filter((c) => getCustomerVisitUrgency(c, store) === 'overdue');
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
    } else if (opts.quickFilter === 'new') {
      const dismissed = loadDismissedNewLeads();
      list = list.filter((c) => isNewCustomer(c, store, dismissed));
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
    'Ansprechperson', 'AP E-Mail', 'AP Telefon',
    'Rechnungsadresse', 'Lieferadresse', 'Zugehörige Firmen', 'BC-Kundennr.',
  ];
  const rows = customers.map((c) => {
    const visit = store[c.id] ?? { lastVisit: null, nextDue: null, notes: '' };
    const urgency = getCustomerVisitUrgency(c, store);
    const status = URGENCY_LABEL_EXPORT[urgency];
    const bl = resolveBundesland(c) ?? '';
    const details = getCustomerDetails(c.id);
    const liefer = effectiveLieferadresse(details);
    const firms = details.zugehoerigeFirmen
      .map((f) => `${f.companyName}${f.relationType ? ` (${f.relationType})` : ''}`)
      .join(' · ');
    return [
      c.name, c.zip, c.city, bl, c.priority, String(c.potentialScore),
      visit.nextDue ?? '', visit.lastVisit ?? '', status, c.sectorLabel, visit.notes,
      details.ansprechperson.name,
      details.ansprechperson.email,
      details.ansprechperson.phone,
      formatAddressLine(details.rechnungsadresse),
      formatAddressLine(liefer),
      firms,
      details.bcCustomerNumber ?? c.customerNumber ?? '',
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
  planning: 'Noch kein Besuch geplant',
  none: 'kein Termin',
};

export const URGENCY_LABEL: Record<VisitUrgency, string> = URGENCY_LABEL_EXPORT;

export const OVERDUE_BANNER_KEY = 'pht_priorities_overdue_banner_dismissed';

export async function fetchOverdueCountForOwner(owner = 'Dominik Weller'): Promise<number> {
  const data = await fetchCustomerPriorities();
  if (!data) return 0;
  const owned = applyEffectivePriorities(data.customers.filter((c) => c.owner === owner));
  const store = migrateVisitStore(owned);
  return countOverdueVisits(owned, store);
}
