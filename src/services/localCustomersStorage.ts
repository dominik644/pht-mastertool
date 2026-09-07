import type { CustomerPriority } from '../types/customerPriority';

const STORAGE_KEY = 'pht-local-customers';
export const LOCAL_CUSTOMERS_CHANGED_EVENT = 'pht-local-customers-changed';

export function loadLocalCustomers(): CustomerPriority[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomerPriority[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCustomers(customers: CustomerPriority[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  window.dispatchEvent(new CustomEvent(LOCAL_CUSTOMERS_CHANGED_EVENT));
}

export function addLocalCustomer(customer: CustomerPriority): CustomerPriority {
  const all = loadLocalCustomers();
  const next = [customer, ...all.filter((c) => c.id !== customer.id)];
  saveLocalCustomers(next);
  return customer;
}

export function mergeLocalCustomers(base: CustomerPriority[]): CustomerPriority[] {
  const local = loadLocalCustomers();
  if (!local.length) return base;
  const ids = new Set(base.map((c) => c.id));
  return [...base, ...local.filter((c) => !ids.has(c.id))];
}
