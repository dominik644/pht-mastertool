const DACH_CODES = new Set(['AT', 'DE', 'CH', 'AUT', 'DEU', 'CHE']);
const DACH_NAMES = [
  'österreich', 'austria', 'deutschland', 'germany', 'schweiz', 'switzerland',
  'at', 'de', 'ch',
];

/** DACH-Filter für Opportunities (AT, DE, CH). */
export function isDachCountry(country?: string | null): boolean {
  if (!country?.trim()) return true;
  const raw = country.trim();
  const upper = raw.toUpperCase();
  if (DACH_CODES.has(upper)) return true;
  const lower = raw.toLowerCase();
  return DACH_NAMES.some((n) => lower.includes(n));
}

export function dachRegionLabel(): string {
  return 'DACH (AT · DE · CH)';
}
