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
  void pushFunnelDeals(deals);
}

async function pushFunnelDeal(deal: SalesFunnelDeal): Promise<void> {
  try {
    await fetch('/api/sales-sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'funnel', payload: deal }),
    });
  } catch {
    // lokal bleibt
  }
}

async function pushFunnelDeals(deals: SalesFunnelDeal[]): Promise<void> {
  if (!deals.length) return;
  try {
    await fetch('/api/sales-sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'funnel-bulk', payload: deals }),
    });
  } catch {
    // lokal bleibt
  }
}

export async function hydrateFunnelDealsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/sales-sync?type=funnel', { credentials: 'include' });
    if (!res.ok) return;
    const body = await res.json() as { skipped?: boolean; deals?: SalesFunnelDeal[] };
    if (body.skipped) return;
    const remote = Array.isArray(body.deals) ? body.deals : [];
    const local = loadAllFunnelDeals();
    const byId = new Map(local.map((d) => [d.id, d]));
    let changed = false;
    for (const deal of remote) {
      if (!deal?.id) continue;
      const existing = byId.get(deal.id);
      if (!existing || String(deal.updatedAt || '') >= String(existing.updatedAt || '')) {
        byId.set(deal.id, { ...existing, ...deal });
        changed = true;
      }
    }
    const merged = [...byId.values()];
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      notifyChanged();
    }
    const remoteIds = new Set(remote.map((d) => d.id));
    const missing = merged.filter((d) => !remoteIds.has(d.id));
    if (missing.length) await pushFunnelDeals(missing);
  } catch {
    // lokal
  }
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  notifyChanged();
  void pushFunnelDeal(deal);
}

export function deleteFunnelDeal(id: string): void {
  saveAllFunnelDeals(loadAllFunnelDeals().filter((d) => d.id !== id));
  void fetch('/api/sales-sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'funnel-delete', id }),
  }).catch(() => undefined);
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

/** Excel-Funnels der Kollegen (Fallback, falls index.json fehlt). */
export const EXCEL_FUNNEL_OWNERS = [
  'Andreas Schmidt',
  'Andy Rehbein',
  'Daniel Beck',
  'Dominik Weller',
  'Holger Stefani',
  'Ronald Gross',
  'Rudolf Tripold',
  'Stefan Wern',
  'Thomas Raab',
];

type FunnelSeedManifestEntry = {
  owner: string;
  file?: string;
  dealCount?: number;
  sourceFile?: string;
};

export async function loadFunnelSeedManifest(): Promise<FunnelSeedManifestEntry[]> {
  try {
    const res = await fetch('/api/snapaddy?route=funnel-seed&index=1', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    const funnels = Array.isArray(data?.funnels) ? data.funnels as FunnelSeedManifestEntry[] : [];
    return funnels.filter((f) => f?.owner?.trim());
  } catch {
    return [];
  }
}

export async function loadFunnelSeedForOwner(ownerKey: string): Promise<SalesFunnelDeal[]> {
  const slug = normalizeOwnerKey(ownerKey).replace(/\s+/g, '-');
  try {
    const res = await fetch(`/api/snapaddy?route=funnel-seed&owner=${encodeURIComponent(slug)}`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.deals) ? data.deals as SalesFunnelDeal[] : [];
  } catch {
    return [];
  }
}

export async function mergeSeedsForOwners(ownerLabels: string[]): Promise<number> {
  const seen = new Set<string>();
  let added = 0;
  for (const label of ownerLabels) {
    const name = label.trim();
    if (!name) continue;
    const key = normalizeOwnerKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const seed = await loadFunnelSeedForOwner(name);
    if (seed.length) added += mergeSeedDeals(seed, name);
  }
  return added;
}

/** Spielt die Excel-Funnels ein: Admin alle Kollegen, Nutzer nur den eigenen. */
export async function importExcelFunnels(opts: {
  admin: boolean;
  ownKey: string;
}): Promise<{ added: number; owners: string[] }> {
  const manifest = await loadFunnelSeedManifest();
  const allOwners = manifest.length
    ? manifest.map((f) => f.owner)
    : EXCEL_FUNNEL_OWNERS;
  const own = normalizeOwnerKey(opts.ownKey);
  const owners = opts.admin
    ? allOwners
    : allOwners.filter((name) => normalizeOwnerKey(name) === own);
  const labels = owners.length ? owners : (opts.ownKey.trim() ? [opts.ownKey] : []);
  const added = await mergeSeedsForOwners(labels);
  return { added, owners: labels };
}

export function funnelOwnerKeyForUser(user: { salesRep?: string | null; name?: string | null; email?: string | null } | null | undefined): string {
  return normalizeOwnerKey(user?.salesRep?.trim() || user?.name?.trim() || user?.email || 'unbekannt');
}

export function filterFunnelDealsForUser<T extends { ownerKey: string }>(
  deals: T[],
  user: { admin?: boolean; role?: string; salesRep?: string | null; name?: string | null; email?: string | null } | null | undefined,
): T[] {
  if (!user) return [];
  if (user.admin === true || user.role === 'admin') return deals;
  const key = funnelOwnerKeyForUser(user);
  return deals.filter((d) => normalizeOwnerKey(d.ownerKey) === key);
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
        : project.toLowerCase().includes('besuch')
          ? `Nach Besuch · Priorität ${customer.priority}`
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
