import { DEFAULT_SALES_REP, resolveSalesRep } from '../lib/territoryConfig';
import type { CustomerPriority } from '../types/customerPriority';
import type { BcSalesTeamResponse, ColleagueTab, FallbackColleague } from '../types/bcSalesTeam';

export async function fetchBcSalesTeam(): Promise<BcSalesTeamResponse> {
  const res = await fetch('/api/bc-salespeople', { credentials: 'include' });
  const data = (await res.json()) as BcSalesTeamResponse;
  if (!res.ok && !data.salespeople) {
    throw new Error(data.error ?? `Verkäufer konnten nicht geladen werden (${res.status})`);
  }
  return {
    configured: data.configured ?? false,
    setupRequired: data.setupRequired,
    salespeople: data.salespeople ?? [],
    gebietsCustomAvailable: data.gebietsCustomAvailable,
    fetchedAt: data.fetchedAt,
    error: data.error,
  };
}

export function buildFallbackColleague(
  customers: CustomerPriority[],
  preferredName?: string | null,
): FallbackColleague {
  const name = preferredName?.trim() || DEFAULT_SALES_REP;
  const assigned = customers.filter((c) => resolveSalesRep(c) === name);
  const blSet = new Set<string>();
  for (const c of assigned) {
    if (c.bundesland) blSet.add(c.bundesland);
  }
  return {
    code: name,
    name,
    customerNumbers: assigned
      .map((c) => c.customerNumber)
      .filter((n): n is string => Boolean(n)),
    customerCount: assigned.length,
    bundeslaender: [...blSet],
    isFallback: true,
  };
}

/** Build one fallback tab per distinct salesRep/owner (when BC is unavailable). */
export function buildFallbackColleagues(
  customers: CustomerPriority[],
  preferredName?: string | null,
): FallbackColleague[] {
  const repNames = new Set<string>();
  for (const c of customers) {
    repNames.add(resolveSalesRep(c));
  }
  const preferred = preferredName?.trim();
  const ordered = [...repNames].sort((a, b) => {
    if (preferred && a === preferred) return -1;
    if (preferred && b === preferred) return 1;
    if (a === DEFAULT_SALES_REP) return -1;
    if (b === DEFAULT_SALES_REP) return 1;
    return a.localeCompare(b, 'de');
  });
  return ordered.map((name) => buildFallbackColleague(customers, name));
}

export function colleagueUrlParam(colleague: ColleagueTab): string {
  return colleague.code || encodeURIComponent(colleague.name);
}

export function findColleagueByParam(
  colleagues: ColleagueTab[],
  param: string | null,
): ColleagueTab | null {
  if (!param || colleagues.length === 0) return colleagues[0] ?? null;
  const decoded = decodeURIComponent(param);
  const upper = decoded.toUpperCase();
  return (
    colleagues.find(
      (c) =>
        c.code === param
        || c.code === decoded
        || c.code.toUpperCase() === upper
        || c.name === decoded
        || c.name.toLowerCase() === decoded.toLowerCase(),
    ) ?? colleagues[0]
  );
}

export function filterCustomersForColleague(
  customers: CustomerPriority[],
  colleague: ColleagueTab,
  bcConfigured: boolean,
): CustomerPriority[] {
  if (bcConfigured && colleague.customerNumbers.length > 0) {
    const numbers = new Set(colleague.customerNumbers.map(String));
    const byNumber = customers.filter(
      (c) => c.customerNumber && numbers.has(String(c.customerNumber)),
    );
    if (byNumber.length > 0) return byNumber;
  }
  return customers.filter((c) => resolveSalesRep(c) === colleague.name);
}
