import type { CustomerPriority } from '../types/customerPriority';
import { getCustomerDetails } from './customerDetailsStorage';
import { getCustomerVisitUrgency } from './customerVisitStorage';
import type { CustomerVisitStore } from '../types/customerPriority';

export interface DuplicateGroup {
  reason: 'matchKey' | 'similarName' | 'zipCity';
  label: string;
  customerIds: string[];
}

export interface DataHealthMetrics {
  duplicateGroups: DuplicateGroup[];
  duplicateCandidateCount: number;
  missingEmailCount: number;
  overdueACount: number;
  plzCorrectedCount: number;
}

function normalizeMatchKey(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesAreSimilar(a: string, b: string): boolean {
  const na = normalizeMatchKey(a);
  const nb = normalizeMatchKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(' ').filter((t) => t.length > 2));
  const tb = new Set(nb.split(' ').filter((t) => t.length > 2));
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  const minSize = Math.min(ta.size, tb.size);
  return overlap >= 2 || (minSize <= 2 && overlap >= 1 && overlap === minSize);
}

function hasEmail(customer: CustomerPriority): boolean {
  if (customer.contactEmail?.trim()) return true;
  const details = getCustomerDetails(customer.id);
  return Boolean(details.ansprechperson.email?.trim());
}

export function computeDataHealth(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
): DataHealthMetrics {
  const duplicateGroups: DuplicateGroup[] = [];

  const byMatchKey = new Map<string, string[]>();
  for (const c of customers) {
    const key = normalizeMatchKey(c.name);
    if (!key) continue;
    const list = byMatchKey.get(key) ?? [];
    list.push(c.id);
    byMatchKey.set(key, list);
  }
  for (const [key, ids] of byMatchKey) {
    if (ids.length > 1) {
      duplicateGroups.push({
        reason: 'matchKey',
        label: `Gleicher Match-Key: „${key}"`,
        customerIds: ids,
      });
    }
  }

  for (let i = 0; i < customers.length; i += 1) {
    for (let j = i + 1; j < customers.length; j += 1) {
      const a = customers[i];
      const b = customers[j];
      if (normalizeMatchKey(a.name) === normalizeMatchKey(b.name)) continue;
      if (namesAreSimilar(a.name, b.name)) {
        duplicateGroups.push({
          reason: 'similarName',
          label: `Ähnliche Namen: „${a.name}" / „${b.name}"`,
          customerIds: [a.id, b.id],
        });
      }
    }
  }

  const byZipCity = new Map<string, string[]>();
  for (const c of customers) {
    if (!c.zip?.trim() || !c.city?.trim()) continue;
    const key = `${c.zip.trim()}|${c.city.trim().toLowerCase()}`;
    const list = byZipCity.get(key) ?? [];
    list.push(c.id);
    byZipCity.set(key, list);
  }
  for (const [key, ids] of byZipCity) {
    if (ids.length > 1) {
      const [zip, city] = key.split('|');
      duplicateGroups.push({
        reason: 'zipCity',
        label: `Gleiche PLZ/Ort: ${zip} ${city}`,
        customerIds: ids,
      });
    }
  }

  const duplicateIds = new Set(duplicateGroups.flatMap((g) => g.customerIds));

  let missingEmailCount = 0;
  let overdueACount = 0;
  let plzCorrectedCount = 0;

  for (const c of customers) {
    if (!hasEmail(c)) missingEmailCount += 1;
    if (c.priority === 'A' && getCustomerVisitUrgency(c, store) === 'overdue') overdueACount += 1;
    if (c.plzCorrected) plzCorrectedCount += 1;
  }

  return {
    duplicateGroups: duplicateGroups.slice(0, 20),
    duplicateCandidateCount: duplicateIds.size,
    missingEmailCount,
    overdueACount,
    plzCorrectedCount,
  };
}

export function customersMissingEmail(customers: CustomerPriority[]): CustomerPriority[] {
  return customers.filter((c) => !hasEmail(c));
}

export function customersOverdueA(
  customers: CustomerPriority[],
  store: CustomerVisitStore,
): CustomerPriority[] {
  return customers.filter(
    (c) => c.priority === 'A' && getCustomerVisitUrgency(c, store) === 'overdue',
  );
}
