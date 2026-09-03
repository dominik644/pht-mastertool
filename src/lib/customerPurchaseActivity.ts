import { getCustomerDetails } from '../services/customerDetailsStorage';
import type { CustomerPriority } from '../types/customerPriority';

/** ~6 Monate ohne Kauf */
export const PURCHASE_INACTIVE_6M_DAYS = 183;
/** 12 Monate ohne Kauf */
export const PURCHASE_INACTIVE_12M_DAYS = 365;

export const PURCHASE_INACTIVE_BANNER_KEY = 'pht_purchase_inactive_banner_dismissed';

export type PurchaseInactivityLevel = 'active' | 'inactive6m' | 'inactive12m' | 'unknown';

export interface CustomerPurchaseActivity {
  daysSince: number | null;
  lastPurchaseDate: string | null;
  level: PurchaseInactivityLevel;
  source: 'bc' | 'excel' | null;
}

export function getCustomerPurchaseActivity(
  customer: CustomerPriority,
  options?: { requireBc?: boolean },
): CustomerPurchaseActivity {
  const requireBc = options?.requireBc ?? false;
  const details = getCustomerDetails(customer.id);

  let daysSince: number | null = null;
  let lastDate: string | null = null;
  let source: 'bc' | 'excel' | null = null;

  if (details.bcLastInvoiceDate && details.bcDaysSincePurchase != null) {
    daysSince = details.bcDaysSincePurchase;
    lastDate = details.bcLastInvoiceDate;
    source = 'bc';
  } else if (!requireBc && customer.daysSincePurchase != null && customer.daysSincePurchase >= 0) {
    daysSince = customer.daysSincePurchase;
    source = 'excel';
    const d = new Date();
    d.setDate(d.getDate() - daysSince);
    lastDate = d.toISOString().slice(0, 10);
  }

  if (daysSince == null) {
    return { daysSince: null, lastPurchaseDate: null, level: 'unknown', source: null };
  }

  let level: PurchaseInactivityLevel = 'active';
  if (daysSince >= PURCHASE_INACTIVE_12M_DAYS) level = 'inactive12m';
  else if (daysSince >= PURCHASE_INACTIVE_6M_DAYS) level = 'inactive6m';

  return { daysSince, lastPurchaseDate: lastDate, level, source };
}

export function isPurchaseInactive(
  customer: CustomerPriority,
  thresholdDays: number,
  requireBc = true,
): boolean {
  const activity = getCustomerPurchaseActivity(customer, { requireBc });
  if (requireBc && activity.source !== 'bc') return false;
  return activity.daysSince != null && activity.daysSince >= thresholdDays;
}

export function countPurchaseInactive(
  customers: CustomerPriority[],
  thresholdDays: number,
  requireBc = true,
): number {
  return customers.filter((c) => isPurchaseInactive(c, thresholdDays, requireBc)).length;
}

export function formatPurchaseInactivityLabel(activity: CustomerPurchaseActivity): string | null {
  if (activity.level === 'inactive12m') {
    return `Kein Kauf seit ${activity.daysSince} Tagen (>12 Mon.)`;
  }
  if (activity.level === 'inactive6m') {
    return `Kein Kauf seit ${activity.daysSince} Tagen (>6 Mon.)`;
  }
  return null;
}
