import {
  emptyCustomerDetails,
  type CustomerDetails,
  type CustomerDetailsStore,
} from '../types/customerDetails';

const STORAGE_KEY = 'pht-customer-details';
export const CUSTOMER_DETAILS_CHANGED_EVENT = 'pht-customer-details-changed';

export function loadCustomerDetailsStore(): CustomerDetailsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CustomerDetailsStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCustomerDetailsStore(store: CustomerDetailsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(CUSTOMER_DETAILS_CHANGED_EVENT));
  } catch {
    // quota exceeded
  }
}

export function getCustomerDetails(customerId: string): CustomerDetails {
  const store = loadCustomerDetailsStore();
  const existing = store[customerId];
  if (!existing) return emptyCustomerDetails();
  return {
    ...emptyCustomerDetails(),
    ...existing,
    ansprechperson: { ...emptyCustomerDetails().ansprechperson, ...existing.ansprechperson },
    rechnungsadresse: { ...emptyCustomerDetails().rechnungsadresse, ...existing.rechnungsadresse },
    lieferadresse: { ...emptyCustomerDetails().lieferadresse, ...existing.lieferadresse },
    zugehoerigeFirmen: existing.zugehoerigeFirmen ?? [],
    additionalContacts: existing.additionalContacts ?? [],
    visitReports: Array.isArray(existing.visitReports) ? existing.visitReports : [],
  };
}

export function updateCustomerDetails(customerId: string, details: CustomerDetails): void {
  const store = loadCustomerDetailsStore();
  store[customerId] = details;
  saveCustomerDetailsStore(store);
  void pushCustomerDetails(customerId, details);
}

async function pushCustomerDetails(customerId: string, details: CustomerDetails): Promise<void> {
  try {
    await fetch('/api/sales-sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'details', customerId, payload: details }),
    });
  } catch {
    // offline – localStorage bleibt Quelle
  }
}

export async function hydrateCustomerDetailsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/sales-sync?type=details', { credentials: 'include' });
    if (!res.ok) return;
    const body = await res.json() as {
      skipped?: boolean;
      details?: Record<string, { details?: CustomerDetails }>;
    };
    if (body.skipped) return;
    const remote = body.details ?? {};
    const store = loadCustomerDetailsStore();
    let changed = false;
    for (const [id, row] of Object.entries(remote)) {
      if (!row?.details) continue;
      store[id] = {
        ...emptyCustomerDetails(),
        ...store[id],
        ...row.details,
        ansprechperson: {
          ...emptyCustomerDetails().ansprechperson,
          ...store[id]?.ansprechperson,
          ...row.details.ansprechperson,
        },
        additionalContacts: row.details.additionalContacts ?? store[id]?.additionalContacts ?? [],
        visitReports: row.details.visitReports ?? store[id]?.visitReports ?? [],
        rechnungsadresse: {
          ...emptyCustomerDetails().rechnungsadresse,
          ...store[id]?.rechnungsadresse,
          ...row.details.rechnungsadresse,
        },
        lieferadresse: {
          ...emptyCustomerDetails().lieferadresse,
          ...store[id]?.lieferadresse,
          ...row.details.lieferadresse,
        },
        zugehoerigeFirmen: row.details.zugehoerigeFirmen ?? store[id]?.zugehoerigeFirmen ?? [],
      };
      changed = true;
    }
    if (changed) saveCustomerDetailsStore(store);
    const missing = Object.fromEntries(
      Object.entries(store).filter(([id]) => !remote[id]),
    );
    if (Object.keys(missing).length > 0) {
      await fetch('/api/sales-sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'details-bulk', store: missing }),
      });
    }
  } catch {
    // bleibt lokal
  }
}

export function mergeBcSyncResults(
  matches: Array<{ localCustomerId: string; details: Partial<CustomerDetails> }>,
): number {
  const store = loadCustomerDetailsStore();
  let merged = 0;
  for (const { localCustomerId, details } of matches) {
    const current = getCustomerDetails(localCustomerId);
    store[localCustomerId] = {
      ...current,
      ...details,
      ansprechperson: { ...current.ansprechperson, ...details.ansprechperson },
      rechnungsadresse: { ...current.rechnungsadresse, ...details.rechnungsadresse },
      lieferadresse: { ...current.lieferadresse, ...details.lieferadresse },
      zugehoerigeFirmen: details.zugehoerigeFirmen?.length
        ? details.zugehoerigeFirmen
        : current.zugehoerigeFirmen,
      bcLastSync: details.bcLastSync ?? new Date().toISOString(),
      bcSalespersonCode: details.bcSalespersonCode ?? current.bcSalespersonCode,
      bcSalespersonName: details.bcSalespersonName ?? current.bcSalespersonName,
      bcBlocked: details.bcBlocked ?? current.bcBlocked,
      bcPaymentTerms: details.bcPaymentTerms ?? current.bcPaymentTerms,
      bcCounty: details.bcCounty ?? current.bcCounty,
      bcLastInvoiceDate: details.bcLastInvoiceDate ?? current.bcLastInvoiceDate,
      bcDaysSincePurchase: details.bcDaysSincePurchase ?? current.bcDaysSincePurchase,
      bcPurchaseCheckedAt: details.bcPurchaseCheckedAt ?? current.bcPurchaseCheckedAt,
    };
    merged += 1;
  }
  saveCustomerDetailsStore(store);
  void fetch('/api/sales-sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'details-bulk',
      store: Object.fromEntries(matches.map((m) => [m.localCustomerId, store[m.localCustomerId]])),
    }),
  });
  return merged;
}

export function formatAddressLine(addr: { street: string; plz: string; ort: string; land: string }): string {
  const parts = [addr.street, [addr.plz, addr.ort].filter(Boolean).join(' '), addr.land].filter(Boolean);
  return parts.join(', ');
}

export function effectiveLieferadresse(details: CustomerDetails) {
  return details.lieferadresseWieRechnung ? details.rechnungsadresse : details.lieferadresse;
}
