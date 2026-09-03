import { AT_PLZ_CENTROIDS } from '../../lib/atPlzCentroids.js';
import {
  DEFAULT_HOME_BASE,
  HOME_BASE_CHANGED_EVENT,
  HOME_BASE_STORAGE_KEY,
  type HomeBase,
} from '../lib/territoryConfig';
import { resolveOutreachUserKey } from './userOutreachTemplate';

const USER_HOME_PREFIX = 'pht_home_base:';

export interface UserHomeBase extends HomeBase {
  street?: string;
  country?: string;
}

function storageKey(userKey: string): string {
  return `${USER_HOME_PREFIX}${userKey.trim().toLowerCase()}`;
}

export function resolveHomeBaseUserKey(
  email?: string | null,
  username?: string | null,
  name?: string | null,
): string {
  return resolveOutreachUserKey(email, username, name);
}

function parseHomeBase(raw: string | null): UserHomeBase | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserHomeBase>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim()
        ? parsed.name.trim()
        : DEFAULT_HOME_BASE.name,
      zip: parsed.zip?.trim() || DEFAULT_HOME_BASE.zip,
      city: parsed.city?.trim() || DEFAULT_HOME_BASE.city,
      lat: parsed.lat,
      lng: parsed.lng,
      street: parsed.street?.trim() || undefined,
      country: parsed.country?.trim() || 'AT',
    };
  } catch {
    return null;
  }
}

export function loadUserHomeBase(userKey: string): UserHomeBase | null {
  return parseHomeBase(localStorage.getItem(storageKey(userKey)));
}

export function saveUserHomeBase(userKey: string, base: UserHomeBase): void {
  localStorage.setItem(storageKey(userKey), JSON.stringify(base));
  window.dispatchEvent(new CustomEvent(HOME_BASE_CHANGED_EVENT, { detail: { userKey } }));
}

export function loadHomeBaseForUser(
  email?: string | null,
  username?: string | null,
  name?: string | null,
): HomeBase {
  const userKey = resolveHomeBaseUserKey(email, username, name);
  const userBase = loadUserHomeBase(userKey);
  if (userBase) return userBase;

  try {
    const legacy = parseHomeBase(localStorage.getItem(HOME_BASE_STORAGE_KEY));
    if (legacy) return legacy;
  } catch {
    /* ignore */
  }

  return { ...DEFAULT_HOME_BASE };
}

export async function geocodeHomeFromAddress(
  zip: string,
  city: string,
  country = 'AT',
): Promise<{ lat: number; lng: number; source: string } | null> {
  const plz = zip.replace(/\D/g, '').padStart(4, '0').slice(0, 4);
  const cityNorm = city.trim().toLowerCase();

  if (country === 'AT' && AT_PLZ_CENTROIDS[plz as keyof typeof AT_PLZ_CENTROIDS]) {
    const c = AT_PLZ_CENTROIDS[plz as keyof typeof AT_PLZ_CENTROIDS];
    return { lat: c.lat, lng: c.lng, source: 'plz' };
  }

  try {
    const res = await fetch('/data/customer-geocodes.json');
    if (res.ok) {
      const data = await res.json() as { entries?: Record<string, { lat: number; lng: number }> };
      const keys = [
        `${country}|${plz}|${cityNorm}`,
        `AT|${plz}|${cityNorm}`,
        `DE|${plz}|${cityNorm}`,
        `CH|${plz}|${cityNorm}`,
      ];
      for (const key of keys) {
        const entry = data.entries?.[key];
        if (entry?.lat != null && entry?.lng != null) {
          return { lat: entry.lat, lng: entry.lng, source: 'geocode-cache' };
        }
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function buildHomeBaseFromAddress(input: {
  name: string;
  street?: string;
  zip: string;
  city: string;
  country?: string;
}): Promise<{ base: UserHomeBase; geocoded: boolean; error?: string }> {
  const country = input.country?.trim() || 'AT';
  const geo = await geocodeHomeFromAddress(input.zip, input.city, country);
  if (!geo) {
    return {
      base: {
        name: input.name.trim() || input.city.trim() || DEFAULT_HOME_BASE.name,
        zip: input.zip.trim(),
        city: input.city.trim(),
        lat: DEFAULT_HOME_BASE.lat,
        lng: DEFAULT_HOME_BASE.lng,
        street: input.street?.trim(),
        country,
      },
      geocoded: false,
      error: 'PLZ/Ort konnte nicht geortet werden – bitte prüfen (AT-PLZ bevorzugt).',
    };
  }
  return {
    base: {
      name: input.name.trim() || input.city.trim(),
      zip: input.zip.trim(),
      city: input.city.trim(),
      lat: geo.lat,
      lng: geo.lng,
      street: input.street?.trim(),
      country,
    },
    geocoded: true,
  };
}
