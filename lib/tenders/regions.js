/**
 * Regionen & Länder – weltweit außer USA und Asien
 */

export const ALLOWED_REGIONS = new Set([
  'Europa',
  'DACH',
  'UK',
  'Afrika',
  'Middle East',
  'Latin America',
  'Oceania',
  'North America',
]);

/** ISO 3166-1 alpha-3 – USA */
export const USA_CODES = new Set(['USA']);

/** Asien (ohne Naher Osten / Türkei in ME-Set) */
export const ASIA_CODES = new Set([
  'CHN', 'JPN', 'IND', 'SGP', 'KOR', 'PRK', 'MYS', 'THA', 'VNM', 'IDN', 'PHL', 'TWN',
  'HKG', 'MAC', 'PAK', 'BGD', 'LKA', 'MMR', 'NPL', 'KHM', 'LAO', 'BRN', 'MNG', 'KAZ',
  'UZB', 'TKM', 'KGZ', 'TJK', 'AFG', 'BTN', 'MDV', 'TLS',
]);

const DACH_CODES = new Set(['DEU', 'AUT', 'CHE']);
const EU_CODES = new Set([
  'DEU', 'AUT', 'FRA', 'ITA', 'NLD', 'BEL', 'POL', 'DNK', 'IRL', 'ESP', 'PRT',
  'SWE', 'FIN', 'GRC', 'CZE', 'ROU', 'HUN', 'SVK', 'BGR', 'HRV', 'SVN', 'LTU',
  'LVA', 'EST', 'LUX', 'MLT', 'CYP', 'GBR', 'UKR', 'MDA', 'BIH', 'SRB', 'MNE',
  'MKD', 'ALB', 'XKX',
]);
const AFRICA_CODES = new Set([
  'ZAF', 'KEN', 'EGY', 'MAR', 'NGA', 'GHA', 'TUN', 'DZA', 'ETH', 'TZA', 'UGA',
  'RWA', 'SEN', 'CIV', 'CMR', 'MOZ', 'AGO', 'NAM', 'BWA', 'ZWE',
]);
const MIDDLE_EAST_CODES = new Set([
  'ARE', 'SAU', 'QAT', 'ISR', 'TUR', 'BHR', 'OMN', 'KWT', 'JOR', 'LBN', 'IRQ', 'IRN',
]);
const LATAM_CODES = new Set([
  'BRA', 'ARG', 'CHL', 'COL', 'PER', 'MEX', 'URY', 'PRY', 'BOL', 'ECU', 'VEN', 'CRI',
  'PAN', 'GTM', 'HND', 'SLV', 'NIC', 'DOM', 'CUB', 'JAM', 'TTO',
]);
const OCEANIA_CODES = new Set(['AUS', 'NZL', 'FJI', 'PNG']);
const NORTH_AMERICA_CODES = new Set(['CAN', 'MEX']);

export const COUNTRY_MAP = {
  DEU: 'Deutschland', AUT: 'Österreich', CHE: 'Schweiz', FRA: 'Frankreich',
  ITA: 'Italien', NLD: 'Niederlande', BEL: 'Belgien', POL: 'Polen', DNK: 'Dänemark',
  IRL: 'Irland', ESP: 'Spanien', PRT: 'Portugal', SWE: 'Schweden', FIN: 'Finnland',
  GBR: 'UK', GRC: 'Griechenland', CZE: 'Tschechien', ROU: 'Rumänien', HUN: 'Ungarn',
  SVK: 'Slowakei', BGR: 'Bulgarien', HRV: 'Kroatien', SVN: 'Slowenien', LTU: 'Litauen',
  LVA: 'Lettland', EST: 'Estland', LUX: 'Luxemburg', MLT: 'Malta', CYP: 'Zypern',
  NOR: 'Norwegen', ISL: 'Island', LIE: 'Liechtenstein', UKR: 'Ukraine', MDA: 'Moldawien',
  ZAF: 'Südafrika', KEN: 'Kenia', EGY: 'Ägypten', MAR: 'Marokko', NGA: 'Nigeria',
  ARE: 'VAE', SAU: 'Saudi-Arabien', QAT: 'Katar', ISR: 'Israel', TUR: 'Türkei',
  CAN: 'Kanada', MEX: 'Mexiko', BRA: 'Brasilien', ARG: 'Argentinien', CHL: 'Chile',
  COL: 'Kolumbien', PER: 'Peru', AUS: 'Australien', NZL: 'Neuseeland',
};

export function mapCountryCode(code) {
  if (!code) return null;
  const upper = String(code).toUpperCase().slice(0, 3);
  return { code: upper, name: COUNTRY_MAP[upper] ?? upper };
}

export function isCountryExcluded(countryCode) {
  if (!countryCode) return false;
  const code = String(countryCode).toUpperCase().slice(0, 3);
  return USA_CODES.has(code) || ASIA_CODES.has(code);
}

export function resolveRegion(countryCode) {
  const code = String(countryCode || '').toUpperCase().slice(0, 3);
  if (!code || isCountryExcluded(code)) return null;
  if (DACH_CODES.has(code)) return 'DACH';
  if (code === 'GBR') return 'UK';
  if (EU_CODES.has(code) || code === 'NOR' || code === 'ISL' || code === 'LIE') return 'Europa';
  if (AFRICA_CODES.has(code)) return 'Afrika';
  if (MIDDLE_EAST_CODES.has(code)) return 'Middle East';
  if (LATAM_CODES.has(code)) return 'Latin America';
  if (OCEANIA_CODES.has(code)) return 'Oceania';
  if (NORTH_AMERICA_CODES.has(code)) return 'North America';
  return 'Europa';
}

export function isRegionAllowed(region) {
  return region && ALLOWED_REGIONS.has(region);
}

export function countryNameToExcluded(countryName) {
  const n = String(countryName || '').toLowerCase();
  const usa = ['usa', 'united states', 'vereinigte staaten', 'u.s.a', 'us'];
  const asia = [
    'china', 'japan', 'india', 'singapur', 'singapore', 'korea', 'vietnam', 'thailand',
    'indonesia', 'malaysia', 'philippines', 'pakistan', 'bangladesh', 'taiwan', 'hong kong',
  ];
  if (usa.some((x) => n === x || n.includes(x))) return true;
  return asia.some((x) => n === x || n.includes(x));
}
