/** BC-synced overlay for customer-priorities fields (localStorage, per browser). */

export interface CustomerBcOverlay {
  contactEmail?: string;
  contactPhone?: string;
  salesRep?: string;
  bcSalespersonCode?: string;
  syncedAt?: string;
}

export type CustomerBcOverlayStore = Record<string, CustomerBcOverlay>;

const STORAGE_KEY = 'pht-customer-bc-overlay';
export const BC_OVERLAY_CHANGED_EVENT = 'pht-customer-bc-overlay-changed';

export function loadBcOverlayStore(): CustomerBcOverlayStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CustomerBcOverlayStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBcOverlayStore(store: CustomerBcOverlayStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(BC_OVERLAY_CHANGED_EVENT));
  } catch {
    // quota exceeded
  }
}

export function getBcOverlay(customerId: string): CustomerBcOverlay | undefined {
  return loadBcOverlayStore()[customerId];
}

export function mergeBcOverlayResults(
  matches: Array<{ localCustomerId: string; overlay?: CustomerBcOverlay }>,
  syncedAt: string,
): number {
  const store = loadBcOverlayStore();
  let merged = 0;
  for (const { localCustomerId, overlay } of matches) {
    if (!overlay) continue;
    const hasData = overlay.contactEmail || overlay.contactPhone || overlay.salesRep || overlay.bcSalespersonCode;
    if (!hasData) continue;
    store[localCustomerId] = { ...store[localCustomerId], ...overlay, syncedAt };
    merged += 1;
  }
  if (merged > 0) saveBcOverlayStore(store);
  return merged;
}

/** Apply BC overlay onto static customer-priorities data. */
export function applyBcOverlay<T extends {
  id: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  salesRep?: string | null;
}>(
  customers: T[],
  store: CustomerBcOverlayStore = loadBcOverlayStore(),
): T[] {
  return customers.map((c) => {
    const o = store[c.id];
    if (!o) return c;
    return {
      ...c,
      ...(o.contactEmail ? { contactEmail: o.contactEmail } : {}),
      ...(o.contactPhone ? { contactPhone: o.contactPhone } : {}),
      ...(o.salesRep ? { salesRep: o.salesRep } : {}),
    };
  });
}
