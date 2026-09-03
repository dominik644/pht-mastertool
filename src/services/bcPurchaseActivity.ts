import { mergeBcSyncResults } from './customerDetailsStorage';
import type { CustomerDetails } from '../types/customerDetails';

export interface BcPurchaseActivityItem {
  localCustomerId: string;
  bcCustomerNumber: string;
  bcLastInvoiceDate: string | null;
  bcDaysSincePurchase: number | null;
  bcPurchaseCheckedAt: string;
}

const REFRESH_MS = 24 * 60 * 60 * 1000;

export function shouldRefreshPurchaseActivity(checkedAt?: string): boolean {
  if (!checkedAt) return true;
  const ts = new Date(checkedAt).getTime();
  return Number.isNaN(ts) || Date.now() - ts > REFRESH_MS;
}

export function mergeBcPurchaseActivityItems(items: BcPurchaseActivityItem[]): number {
  if (!items.length) return 0;
  return mergeBcSyncResults(
    items.map((item) => ({
      localCustomerId: item.localCustomerId,
      details: {
        bcLastInvoiceDate: item.bcLastInvoiceDate ?? undefined,
        bcDaysSincePurchase: item.bcDaysSincePurchase,
        bcPurchaseCheckedAt: item.bcPurchaseCheckedAt,
      } satisfies Partial<CustomerDetails>,
    })),
  );
}

export async function refreshBcPurchaseActivity(
  mappings: Array<{ localCustomerId: string; bcCustomerNumber: string }>,
): Promise<number> {
  if (mappings.length === 0) return 0;
  const res = await fetch('/api/bc-purchase-activity', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mappings }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `BC Kaufaktivität (${res.status})`);
  }
  const items = Array.isArray(data.items) ? data.items as BcPurchaseActivityItem[] : [];
  return mergeBcPurchaseActivityItems(items);
}

export function buildPurchaseActivityMappings(
  customers: Array<{ id: string; customerNumber?: string | null }>,
  resolveBcNumber: (customerId: string) => string | undefined,
): Array<{ localCustomerId: string; bcCustomerNumber: string }> {
  const out: Array<{ localCustomerId: string; bcCustomerNumber: string }> = [];
  const seen = new Set<string>();
  for (const c of customers) {
    const bcNo = resolveBcNumber(c.id) || (c.customerNumber ? String(c.customerNumber).trim() : '');
    if (!bcNo || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ localCustomerId: c.id, bcCustomerNumber: bcNo });
  }
  return out;
}

export function mappingsNeedingRefresh(
  mappings: Array<{ localCustomerId: string; bcCustomerNumber: string }>,
  isStale: (customerId: string) => boolean,
): Array<{ localCustomerId: string; bcCustomerNumber: string }> {
  return mappings.filter((m) => isStale(m.localCustomerId));
}
