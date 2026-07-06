export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CustomerGeocodeEntry {
  lat: number;
  lng: number;
  source: 'plz' | 'nominatim' | 'city' | 'manual';
  plz?: string;
  city?: string;
}

export interface CustomerGeocodesFile {
  generatedAt: string;
  count: number;
  entries: Record<string, CustomerGeocodeEntry>;
}

let cache: CustomerGeocodesFile | null = null;

export function geocodeKey(zip: string, city: string, country: string): string {
  return `${String(country).toUpperCase()}|${String(zip).trim()}|${String(city).trim().toLowerCase()}`;
}

export async function fetchCustomerGeocodes(): Promise<CustomerGeocodesFile | null> {
  if (cache) return cache;
  try {
    const res = await fetch('/data/customer-geocodes.json');
    if (!res.ok) return null;
    cache = (await res.json()) as CustomerGeocodesFile;
    return cache;
  } catch {
    return null;
  }
}

export function getCustomerPoint(
  geocodes: CustomerGeocodesFile | null,
  customerId: string,
  zip: string,
  city: string,
  country: string,
): GeoPoint | null {
  if (!geocodes) return null;
  const byId = geocodes.entries[customerId];
  if (byId) return { lat: byId.lat, lng: byId.lng };
  const byKey = geocodes.entries[geocodeKey(zip, city, country)];
  if (byKey) return { lat: byKey.lat, lng: byKey.lng };
  return null;
}
