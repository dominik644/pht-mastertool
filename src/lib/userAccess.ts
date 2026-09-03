import type { AppUser } from '../context/AppAuthContext';
import type { ColleagueTab } from '../types/bcSalesTeam';
import type { CustomerPriority } from '../types/customerPriority';
import { resolveSalesRep } from './territoryConfig';
import { findColleagueByParam } from '../services/bcSalesTeam';

export type AppRole = 'admin' | 'user';

/** Admin-only frontend routes (prefix match on pathname). */
export const ADMIN_ROUTE_PREFIXES = [
  '/tenders',
  '/coverage',
  '/go-no-go',
  '/workflow',
  '/watchlist',
  '/calendar',
  '/todo',
  '/alerts',
  '/analytics',
  '/similarity',
  '/profiles',
  '/opportunities',
  '/quote',
  '/settings',
] as const;

export function userRole(user: AppUser | null | undefined): AppRole {
  if (!user) return 'user';
  return user.admin ? 'admin' : 'user';
}

export function isAppAdmin(user: AppUser | null | undefined): boolean {
  return userRole(user) === 'admin';
}

export function canAccessTenders(user: AppUser | null | undefined): boolean {
  return isAppAdmin(user);
}

export function isAdminOnlyPath(pathname: string): boolean {
  const p = pathname.split('?')[0];
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

export function defaultHomePath(user: AppUser | null | undefined): string {
  return isAppAdmin(user) ? '/command-center' : '/priorities';
}

/** Match logged-in user to a BC colleague tab (code or display name). */
export function findColleagueForUser(
  colleagues: ColleagueTab[],
  user: AppUser | null | undefined,
): ColleagueTab | null {
  if (!user || colleagues.length === 0) return colleagues[0] ?? null;
  const code = user.bcSalespersonCode?.trim().toUpperCase();
  const rep = (user.salesRep ?? user.name)?.trim();
  if (code) {
    const byCode = colleagues.find((c) => c.code.toUpperCase() === code);
    if (byCode) return byCode;
  }
  if (rep) {
    const lower = rep.toLowerCase();
    const byName = colleagues.find(
      (c) => c.name === rep || c.name.toLowerCase() === lower,
    );
    if (byName) return byName;
  }
  return colleagues[0] ?? null;
}

/** Colleagues visible in Tourenplanung – admin sees all, user only own. */
export function colleaguesForUser(
  colleagues: ColleagueTab[],
  user: AppUser | null | undefined,
): ColleagueTab[] {
  if (isAppAdmin(user) || !user) return colleagues;
  const own = findColleagueForUser(colleagues, user);
  return own ? [own] : colleagues.slice(0, 1);
}

/** Resolve selected colleague; non-admins cannot switch via URL. */
export function resolveSelectedColleague(
  colleagues: ColleagueTab[],
  colleagueParam: string | null,
  user: AppUser | null | undefined,
): ColleagueTab | null {
  const visible = colleaguesForUser(colleagues, user);
  if (visible.length === 0) return null;
  if (!isAppAdmin(user)) return visible[0];
  return findColleagueByParam(visible, colleagueParam) ?? visible[0];
}

export function userSalesRepLabel(user: AppUser | null | undefined): string | undefined {
  return user?.salesRep?.trim() || user?.name?.trim() || undefined;
}

/** Kunden sichtbar für Nutzer – Admin: alle Kollegen-Daten, User: nur eigenes Gebiet. */
export function filterCustomersForAppUser(
  customers: CustomerPriority[],
  user: AppUser | null | undefined,
): CustomerPriority[] {
  if (!user || isAppAdmin(user)) return customers;
  const rep = userSalesRepLabel(user);
  if (!rep) return [];
  return customers.filter((c) => resolveSalesRep(c) === rep);
}
