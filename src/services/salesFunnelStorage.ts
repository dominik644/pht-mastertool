import type { SalesFunnelDeal, SalesFunnelMetrics } from '../types/salesFunnel';
import type { CustomerPriority } from '../types/customerPriority';
import { getCustomerDetails } from './customerDetailsStorage';
import {
  isPurchaseInactive,
  PURCHASE_INACTIVE_6M_DAYS,
} from '../lib/customerPurchaseActivity';

const STORAGE_KEY = 'pht_sales_funnel_deals_v1';
export const SALES_FUNNEL_CHANGED_EVENT = 'pht-sales-funnel-changed';

function nowIso(): string {
  return new Date().toISOString();
}

function notifyChanged(): void {
  window.dispatchEvent(new CustomEvent(SALES_FUNNEL_CHANGED_EVENT));
}

export function normalizeOwnerKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function loadAllFunnelDeals(): SalesFunnelDeal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SalesFunnelDeal[]) : [];
  } catch {
    return [];
  }
}

export function saveAllFunnelDeals(deals: SalesFunnelDeal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  notifyChanged();
}

export function loadFunnelDealsForOwner(ownerKey: string): SalesFunnelDeal[] {
  const key = normalizeOwnerKey(ownerKey);
  return loadAllFunnelDeals().filter((d) => normalizeOwnerKey(d.ownerKey) === key);
}

export function upsertFunnelDeal(deal: SalesFunnelDeal): void {
  const all = loadAllFunnelDeals();
  const idx = all.findIndex((d) => d.id === deal.id);
  if (idx >= 0) all[idx] = deal;
  else all.unshift(deal);
  saveAllFunnelDeals(all);
}

export function deleteFunnelDeal(id: string): void {
  saveAllFunnelDeals(loadAllFunnelDeals().filter((d) => d.id !== id));
}

export function createFunnelDeal(
  ownerKey: string,
  input: Omit<SalesFunnelDeal, 'id' | 'ownerKey' | 'createdAt' | 'updatedAt'>,
): SalesFunnelDeal {
  const ts = nowIso();
  const deal: SalesFunnelDeal = {
    ...input,
    id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerKey: normalizeOwnerKey(ownerKey),
    forecast: input.forecast ?? Math.round(input.volume * (input.winProbability / 100)),
    createdAt: ts,
    updatedAt: ts,
  };
  upsertFunnelDeal(deal);
  return deal;
}

export function updateFunnelDeal(
  id: string,
  patch: Partial<Omit<SalesFunnelDeal, 'id' | 'ownerKey' | 'createdAt'>>,
): SalesFunnelDeal | null {
  const all = loadAllFunnelDeals();
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const next = {
    ...all[idx],
    ...patch,
    updatedAt: nowIso(),
  };
  if (patch.volume !== undefined || patch.winProbability !== undefined) {
    next.forecast = Math.round(next.volume * (next.winProbability / 100));
  }
  all[idx] = next;
  saveAllFunnelDeals(all);
  return next;
}

export function mergeSeedDeals(seed: SalesFunnelDeal[], ownerKey: string): number {
  const key = normalizeOwnerKey(ownerKey);
  const all = loadAllFunnelDeals();
  const existing = new Set(
    all.filter((d) => normalizeOwnerKey(d.ownerKey) === key).map((d) => d.offerNumber || d.id),
  );
  let added = 0;
  for (const deal of seed) {
    const token = deal.offerNumber || deal.id;
    if (existing.has(token)) continue;
    all.push({ ...deal, ownerKey: key });
    existing.add(token);
    added++;
  }
  if (added > 0) saveAllFunnelDeals(all);
  return added;
}

export async function loadFunnelSeedForOwner(ownerKey: string): Promise<SalesFunnelDeal[]> {
  const slug = normalizeOwnerKey(ownerKey).replace(/\s+/g, '-');
  try {
    const res = await fetch(`/data/sales-funnels/${slug}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.deals) ? data.deals as SalesFunnelDeal[] : [];
  } catch {
    return [];
  }
}

export function computeFunnelMetrics(deals: SalesFunnelDeal[]): SalesFunnelMetrics {
  const byStatus: Record<string, number> = {};
  let pipelineVolume = 0;
  let weightedForecast = 0;
  let wonVolume = 0;
  let activeCount = 0;

  for (const d of deals) {
    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
    if (d.status === 'Gewonnen') {
      wonVolume += d.volume;
    } else if (d.status === 'Verloren') {
      // skip
    } else {
      activeCount++;
      pipelineVolume += d.volume;
      weightedForecast += d.forecast;
    }
  }

  return {
    dealCount: deals.length,
    activeCount,
    pipelineVolume,
    weightedForecast,
    wonVolume,
    byStatus,
  };
}

export function aggregateFunnelByOwner(deals: SalesFunnelDeal[]): Map<string, SalesFunnelMetrics> {
  const map = new Map<string, SalesFunnelDeal[]>();
  for (const d of deals) {
    const key = normalizeOwnerKey(d.ownerKey);
    const list = map.get(key) ?? [];
    list.push(d);
    map.set(key, list);
  }
  const result = new Map<string, SalesFunnelMetrics>();
  for (const [key, list] of map) {
    result.set(key, computeFunnelMetrics(list));
  }
  return result;
}

export function findFunnelDeal(id: string): SalesFunnelDeal | undefined {
  return loadAllFunnelDeals().find((d) => d.id === id);
}

export function findFunnelByCustomerId(
  ownerKey: string,
  customerId: string,
): SalesFunnelDeal | undefined {
  const key = normalizeOwnerKey(ownerKey);
  return loadFunnelDealsForOwner(key).find(
    (d) => d.customerId === customerId && d.status !== 'Verloren',
  );
}

export function isCustomerInFunnel(ownerKey: string, customerId: string): boolean {
  return !!findFunnelByCustomerId(ownerKey, customerId);
}

export function winProbabilityFromPriority(priority: string): number {
  if (priority === 'A') return 40;
  if (priority === 'B') return 25;
  return 15;
}

export function addFromCustomerToFunnel(
  ownerKey: string,
  customer: Pick<
    CustomerPriority,
    'id' | 'name' | 'city' | 'country' | 'priority' | 'potentialScore' | 'contactEmail'
  >,
  project = '',
): SalesFunnelDeal {
  const existing = findFunnelByCustomerId(ownerKey, customer.id);
  if (existing) return existing;

  const details = getCustomerDetails(customer.id);
  const contact =
    details.ansprechperson.name?.trim() ||
    customer.contactEmail?.trim() ||
    undefined;
  const volume = Math.round(customer.potentialScore * 1000);
  const winProbability = winProbabilityFromPriority(customer.priority);

  return createFunnelDeal(ownerKey, {
    customerId: customer.id,
    sourceType: 'customer',
    customer: customer.name,
    project,
    city: customer.city,
    country: customer.country,
    contactPerson: contact,
    status: 'In Bearbeitung',
    quarter: 'NEU',
    volume,
    winProbability,
    forecast: 0,
    activities: [{
      type: 'Lead angelegt',
      date: new Date().toISOString().slice(0, 10),
      result: project.includes('Reaktivierung')
        ? 'Reaktivierung – lange kein Kauf (BC)'
        : `Aus Tourenplanung · Priorität ${customer.priority}`,
    }],
    notes: `Kunden-Priorität ${customer.priority} · ${customer.city}`,
  });
}

export function bulkAddInactiveCustomersToFunnel(
  ownerKey: string,
  customers: CustomerPriority[],
  minInactiveDays = PURCHASE_INACTIVE_6M_DAYS,
): { created: number; skipped: number } {
  let created = 0;
  let skipped = 0;
  for (const customer of customers) {
    if (!isPurchaseInactive(customer, minInactiveDays, true)) continue;
    if (findFunnelByCustomerId(ownerKey, customer.id)) {
      skipped += 1;
      continue;
    }
    addFromCustomerToFunnel(ownerKey, customer, 'Reaktivierung – kein Kauf');
    created += 1;
  }
  return { created, skipped };
}
