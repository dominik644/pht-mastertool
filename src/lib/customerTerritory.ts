import type { ColleagueTab } from '../types/bcSalesTeam';
import type { CustomerPriority } from '../types/customerPriority';
import { resolveBundesland } from '../services/customerVisitStorage';
import {
  resolveSalesRep,
  VERTRIEB_OST_BUNDESLAENDER,
  VERTRIEB_WEST_BUNDESLAENDER,
} from './territoryConfig';

const AT_BUNDESLAENDER = new Set<string>([
  ...VERTRIEB_OST_BUNDESLAENDER,
  ...VERTRIEB_WEST_BUNDESLAENDER,
]);

/** Bekannte Zuordnung Rep → Bundesländer (PLZ-Gebiet). */
const REP_BUNDESLAENDER: Record<string, readonly string[]> = {
  'Dominik Weller': VERTRIEB_OST_BUNDESLAENDER,
  'Rudolf Tripold': VERTRIEB_WEST_BUNDESLAENDER,
};

export function isGermanCustomer(customer: CustomerPriority): boolean {
  const cc = String(customer.country ?? '').toUpperCase();
  if (cc === 'DE' || cc === 'DEU' || cc === 'GERMANY') return true;
  const zip = String(customer.zip ?? '').trim().replace(/\s+/g, '');
  if (/^\d{5}$/.test(zip)) return true;
  const bl = resolveBundesland(customer);
  if (bl && !AT_BUNDESLAENDER.has(bl)) return true;
  return false;
}

/** Bundesländer für einen Vertreter – aus Stammdaten oder Fallback-Konfiguration. */
export function colleagueTerritoryFromCustomers(
  customers: CustomerPriority[],
  repName: string,
): string[] {
  const preset = REP_BUNDESLAENDER[repName];
  if (preset?.length) return [...preset];
  const blSet = new Set<string>();
  for (const c of customers) {
    if (resolveSalesRep(c) !== repName) continue;
    const bl = resolveBundesland(c);
    if (bl && AT_BUNDESLAENDER.has(bl)) blSet.add(bl);
  }
  return [...blSet].sort((a, b) => a.localeCompare(b, 'de'));
}

export function customerInColleagueTerritory(
  customer: CustomerPriority,
  colleague: ColleagueTab,
): boolean {
  const regions = colleague.bundeslaender?.length
    ? colleague.bundeslaender
    : colleagueTerritoryFromCustomers([], colleague.name);

  if (regions.length > 0) {
    if (isGermanCustomer(customer)) return false;
    const bl = resolveBundesland(customer);
    if (bl && AT_BUNDESLAENDER.has(bl)) {
      return regions.includes(bl);
    }
    return resolveSalesRep(customer) === colleague.name;
  }

  return resolveSalesRep(customer) === colleague.name;
}

export function syntheticColleagueForUser(
  customers: CustomerPriority[],
  repName: string,
  bcCode?: string | null,
): ColleagueTab {
  return {
    code: bcCode?.trim() || repName,
    name: repName,
    customerNumbers: [],
    customerCount: 0,
    bundeslaender: colleagueTerritoryFromCustomers(customers, repName),
  };
}
