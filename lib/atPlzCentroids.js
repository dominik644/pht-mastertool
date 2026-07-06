/**
 * Austrian PLZ centroid lookup (offline).
 * Keys: 4-digit PLZ. Values: { lat, lng, city? }
 * Seeded from major cities + PLZ-range interpolation; enriched by geocode script.
 */
export const AT_PLZ_CENTROIDS = {
  '1010': { lat: 48.2082, lng: 16.3738, city: 'Wien' },
  '1020': { lat: 48.2167, lng: 16.4000, city: 'Wien' },
  '1030': { lat: 48.1944, lng: 16.3944, city: 'Wien' },
  '1040': { lat: 48.1950, lng: 16.3667, city: 'Wien' },
  '1050': { lat: 48.1867, lng: 16.3500, city: 'Wien' },
  '1060': { lat: 48.1967, lng: 16.3500, city: 'Wien' },
  '1070': { lat: 48.2033, lng: 16.3467, city: 'Wien' },
  '1080': { lat: 48.2133, lng: 16.3467, city: 'Wien' },
  '1090': { lat: 48.2267, lng: 16.3567, city: 'Wien' },
  '1100': { lat: 48.1533, lng: 16.3800, city: 'Wien' },
  '1110': { lat: 48.1767, lng: 16.4200, city: 'Wien' },
  '1120': { lat: 48.1733, lng: 16.3333, city: 'Wien' },
  '1130': { lat: 48.1833, lng: 16.2667, city: 'Wien' },
  '1140': { lat: 48.2000, lng: 16.2833, city: 'Wien' },
  '1150': { lat: 48.2000, lng: 16.3333, city: 'Wien' },
  '1160': { lat: 48.2167, lng: 16.3000, city: 'Wien' },
  '1170': { lat: 48.2333, lng: 16.2833, city: 'Wien' },
  '1180': { lat: 48.2333, lng: 16.3333, city: 'Wien' },
  '1190': { lat: 48.2500, lng: 16.3500, city: 'Wien' },
  '1200': { lat: 48.2333, lng: 16.3667, city: 'Wien' },
  '1210': { lat: 48.2667, lng: 16.4000, city: 'Wien' },
  '1220': { lat: 48.2167, lng: 16.4500, city: 'Wien' },
  '1230': { lat: 48.1500, lng: 16.2833, city: 'Wien' },
  '2000': { lat: 48.3450, lng: 16.3150, city: 'Stockerau' },
  '2100': { lat: 48.3333, lng: 16.7167, city: 'Korneuburg' },
  '2201': { lat: 48.3500, lng: 16.3167, city: 'Gerasdorf' },
  '2301': { lat: 48.1083, lng: 16.3183, city: 'Groß-Enzersdorf' },
  '2340': { lat: 48.0167, lng: 16.2833, city: 'Mödling' },
  '2401': { lat: 48.0167, lng: 16.2333, city: 'Fischamend' },
  '2500': { lat: 47.9667, lng: 16.6000, city: 'Baden' },
  '2512': { lat: 48.0167, lng: 16.2833, city: 'Traiskirchen' },
  '2700': { lat: 47.8167, lng: 16.2333, city: 'Wiener Neustadt' },
  '2823': { lat: 47.7167, lng: 16.0667, city: 'Pitten' },
  '3003': { lat: 48.2000, lng: 16.2667, city: 'Gablitz' },
  '3100': { lat: 48.0833, lng: 15.6167, city: 'St. Pölten' },
  '3331': { lat: 47.9500, lng: 14.7833, city: 'Kematen' },
  '4020': { lat: 48.3069, lng: 14.2858, city: 'Linz' },
  '4030': { lat: 48.2500, lng: 14.2500, city: 'Linz' },
  '4040': { lat: 48.3167, lng: 14.2833, city: 'Linz' },
  '4400': { lat: 48.0425, lng: 14.4211, city: 'Steyr' },
  '4600': { lat: 48.1575, lng: 13.9917, city: 'Wels' },
  '4810': { lat: 47.8131, lng: 13.0431, city: 'Gmunden' },
  '5020': { lat: 47.8095, lng: 13.0550, city: 'Salzburg' },
  '6020': { lat: 47.2692, lng: 11.4041, city: 'Innsbruck' },
  '6800': { lat: 47.2333, lng: 9.6000, city: 'Feldkirch' },
  '6900': { lat: 47.5000, lng: 9.7500, city: 'Bregenz' },
  '7000': { lat: 47.8450, lng: 16.5250, city: 'Eisenstadt' },
  '8010': { lat: 47.0707, lng: 15.4395, city: 'Graz' },
  '8020': { lat: 47.0667, lng: 15.4500, city: 'Graz' },
  '8055': { lat: 47.0333, lng: 15.4667, city: 'Graz' },
  '8700': { lat: 47.3833, lng: 15.1000, city: 'Leoben' },
  '9020': { lat: 46.6247, lng: 14.3053, city: 'Klagenfurt' },
  '9300': { lat: 46.7833, lng: 14.8500, city: 'St. Veit' },
  '9500': { lat: 46.6167, lng: 13.8500, city: 'Villach' },
};

/** Bundesland anchor points for PLZ-range interpolation. */
const BL_ANCHORS = [
  { min: 1010, max: 1239, lat: 48.21, lng: 16.37 },
  { min: 1400, max: 1423, lat: 48.28, lng: 16.40 },
  { min: 2000, max: 3999, lat: 48.10, lng: 15.80 },
  { min: 4000, max: 4999, lat: 48.20, lng: 14.00 },
  { min: 5000, max: 5999, lat: 47.80, lng: 13.05 },
  { min: 6000, max: 6699, lat: 47.27, lng: 11.40 },
  { min: 6700, max: 6999, lat: 47.50, lng: 9.75 },
  { min: 7000, max: 7999, lat: 47.85, lng: 16.40 },
  { min: 8000, max: 8999, lat: 47.07, lng: 15.44 },
  { min: 9000, max: 9999, lat: 46.62, lng: 14.31 },
];

/**
 * @param {string} plz
 * @returns {{ lat: number, lng: number, city?: string } | null}
 */
export function lookupAtPlz(plz) {
  const key = String(plz).trim().padStart(4, '0').slice(0, 4);
  if (AT_PLZ_CENTROIDS[key]) return AT_PLZ_CENTROIDS[key];

  const n = parseInt(key, 10);
  if (Number.isNaN(n)) return null;

  const anchor = BL_ANCHORS.find((a) => n >= a.min && n <= a.max);
  if (!anchor) return null;

  const t = (n - anchor.min) / Math.max(anchor.max - anchor.min, 1);
  const jitter = ((n % 97) - 48) * 0.002;
  return {
    lat: anchor.lat + (t - 0.5) * 0.35 + jitter,
    lng: anchor.lng + (t - 0.5) * 0.45 - jitter * 0.5,
    city: undefined,
  };
}

/**
 * @param {string} zip
 * @param {string} country
 * @returns {{ lat: number, lng: number } | null}
 */
export function lookupPlzCentroid(zip, country) {
  const cc = String(country ?? '').toUpperCase();
  const plz = String(zip ?? '').trim();
  if (cc === 'AT' || (/^\d{4}$/.test(plz) && cc !== 'DE')) {
    return lookupAtPlz(plz);
  }
  if (cc === 'DE' || /^\d{5}$/.test(plz)) {
    const p = parseInt(plz.slice(0, 2), 10);
    if (Number.isNaN(p)) return null;
    return { lat: 51.0 + (p % 5) * 0.3, lng: 7.0 + p * 0.15 };
  }
  return null;
}
