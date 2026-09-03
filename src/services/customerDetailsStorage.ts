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
  };
}

export function updateCustomerDetails(customerId: string, details: CustomerDetails): void {
  const store = loadCustomerDetailsStore();
  store[customerId] = details;
  saveCustomerDetailsStore(store);
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
    };
    merged += 1;
  }
  saveCustomerDetailsStore(store);
  return merged;
}

export function formatAddressLine(addr: { street: string; plz: string; ort: string; land: string }): string {
  const parts = [addr.street, [addr.plz, addr.ort].filter(Boolean).join(' '), addr.land].filter(Boolean);
  return parts.join(', ');
}

export function effectiveLieferadresse(details: CustomerDetails) {
  return details.lieferadresseWieRechnung ? details.rechnungsadresse : details.lieferadresse;
}
