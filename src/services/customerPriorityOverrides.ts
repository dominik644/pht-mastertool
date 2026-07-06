import { addDays, addMonths, format, parseISO } from 'date-fns';
import type { CustomerPriority, CustomerVisitState, VisitPriority } from '../types/customerPriority';
import {
  getVisitState,
  loadVisitStore,
  saveVisitStore,
  VISIT_CADENCE_MONTHS,
} from './customerVisitStorage';

export const PRIORITY_OVERRIDE_KEY = 'pht-customer-priority-overrides';
export const PRIORITY_CHANGED_EVENT = 'pht-customer-priority-changed';

export type PriorityOverrides = Record<string, VisitPriority>;

export function loadPriorityOverrides(): PriorityOverrides {
  try {
    const raw = localStorage.getItem(PRIORITY_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PriorityOverrides;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePriorityOverrides(overrides: PriorityOverrides): void {
  try {
    localStorage.setItem(PRIORITY_OVERRIDE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(PRIORITY_CHANGED_EVENT));
  } catch {
    // quota exceeded
  }
}

export function getEffectivePriority(
  customer: CustomerPriority,
  overrides: PriorityOverrides = loadPriorityOverrides(),
): VisitPriority {
  return overrides[customer.id] ?? customer.priority;
}

export function isPriorityOverridden(
  customerId: string,
  overrides: PriorityOverrides = loadPriorityOverrides(),
): boolean {
  return customerId in overrides;
}

export function withEffectivePriority(
  customer: CustomerPriority,
  overrides: PriorityOverrides = loadPriorityOverrides(),
): CustomerPriority {
  const priority = getEffectivePriority(customer, overrides);
  if (priority === customer.priority && customer.visitCadenceMonths === VISIT_CADENCE_MONTHS[priority]) {
    return customer;
  }
  return {
    ...customer,
    priority,
    visitCadenceMonths: VISIT_CADENCE_MONTHS[priority],
  };
}

export function applyEffectivePriorities(
  customers: CustomerPriority[],
  overrides: PriorityOverrides = loadPriorityOverrides(),
): CustomerPriority[] {
  return customers.map((c) => withEffectivePriority(c, overrides));
}

/** nextDue after a manual priority change (A unvisited → overdue). */
export function computeNextDueForPriority(
  priority: VisitPriority,
  visit: CustomerVisitState,
  today = new Date(),
): string {
  if (visit.lastVisit) {
    return format(addMonths(parseISO(visit.lastVisit), VISIT_CADENCE_MONTHS[priority]), 'yyyy-MM-dd');
  }
  if (priority === 'A') {
    return format(addDays(today, -1), 'yyyy-MM-dd');
  }
  return format(addMonths(today, VISIT_CADENCE_MONTHS[priority]), 'yyyy-MM-dd');
}

export function setPriorityOverride(
  customerId: string,
  priority: VisitPriority,
  importPriority: VisitPriority,
): CustomerVisitState {
  const overrides = loadPriorityOverrides();
  if (priority === importPriority) {
    delete overrides[customerId];
  } else {
    overrides[customerId] = priority;
  }
  savePriorityOverrides(overrides);

  const visit = getVisitState(customerId);
  const nextDue = computeNextDueForPriority(priority, visit);
  const store = loadVisitStore();
  const state: CustomerVisitState = { ...visit, nextDue };
  store[customerId] = state;
  saveVisitStore(store);
  return state;
}
