/** Vertrieb Ost – Dominik Weller territory (6 Bundesländer). */
export const VERTRIEB_OST_BUNDESLAENDER = [
  'Wien',
  'Niederösterreich',
  'Oberösterreich',
  'Steiermark',
  'Burgenland',
  'Kärnten',
] as const;

export const DEFAULT_HOME_BASE = {
  name: 'Pitten',
  zip: '2823',
  city: 'Pitten',
  lat: 47.7167,
  lng: 16.0667,
} as const;

export const HOME_BASE_STORAGE_KEY = 'pht-sales-home-base';

export interface HomeBase {
  name: string;
  zip: string;
  city: string;
  lat: number;
  lng: number;
}

export function loadHomeBase(): HomeBase {
  try {
    const raw = localStorage.getItem(HOME_BASE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HOME_BASE };
    const parsed = JSON.parse(raw) as Partial<HomeBase>;
    if (
      typeof parsed.lat === 'number'
      && typeof parsed.lng === 'number'
      && typeof parsed.name === 'string'
    ) {
      return {
        name: parsed.name,
        zip: parsed.zip ?? DEFAULT_HOME_BASE.zip,
        city: parsed.city ?? DEFAULT_HOME_BASE.city,
        lat: parsed.lat,
        lng: parsed.lng,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_HOME_BASE };
}

export function saveHomeBase(base: HomeBase): void {
  localStorage.setItem(HOME_BASE_STORAGE_KEY, JSON.stringify(base));
}
