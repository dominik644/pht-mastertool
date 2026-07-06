/**
 * PLZ/Ort validation and reconciliation for AT/DE customers.
 * Excel import: zip/city from Excel are the starting point; invalid pairs may be corrected via Nominatim.
 */
import { lookupAtPlz } from './atPlzCentroids.js';
import { inferBundesland } from './bundeslandFromPlz.js';

const FOREIGN_CITY_PATTERNS = [
  { pattern: /baku|azer/i, country: 'OTHER' },
  { pattern: /budapest|debrecen|győr|gyor/i, country: 'HU' },
  { pattern: /praha|brno|ostrava|plzeň|plzen|sušice|susice|jirny/i, country: 'CZ' },
  { pattern: /bratislava|košice|kosice/i, country: 'SK' },
  { pattern: /ljubljana|maribor/i, country: 'SI' },
];

/** Known DE PLZ → primary Ort (partial lookup for cross-check). */
const DE_PLZ_CITIES = {
  '80331': 'München',
  '83093': 'Bad Endorf',
  '14974': 'Ludwigsfelde',
  '86633': 'Neuburg',
  '10115': 'Berlin',
  '28195': 'Bremen',
  '20354': 'Hamburg',
  '64404': 'Bickenbach',
  '77855': 'Achern',
};

const NOMINATIM_DELAY_MS = 1100;
let lastNominatimAt = 0;

/** @param {string} city */
export function normCity(city) {
  return String(city ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(st\.?|sankt|ig)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/** @param {string} a @param {string} b */
export function citiesMatch(a, b) {
  const na = normCity(a);
  const nb = normCity(b);
  if (!na || !nb) return true;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  if ((na === 'wien' || na === 'vienna') && (nb === 'wien' || nb === 'vienna')) return true;
  return false;
}

/**
 * @param {string} zip
 * @param {string} [country]
 * @returns {{ zip: string, country: string, valid: boolean, issue?: string }}
 */
export function normalizePlz(zip, country = 'AT') {
  const raw = String(zip ?? '').trim();
  let cc = String(country ?? 'AT').toUpperCase();

  if (!raw) {
    return { zip: '', country: cc, valid: false, issue: 'PLZ fehlt' };
  }

  // Czech PLZ: 3 digits + space + 2 digits (e.g. 250 90)
  if (/^\d{3}\s\d{2}$/.test(raw)) {
    return { zip: raw, country: 'CZ', valid: false, issue: `Tschechische PLZ (${raw})` };
  }

  const compact = raw.replace(/\s+/g, '');

  if (/^\d{4}$/.test(compact)) {
    if (compact.startsWith('8') && cc === 'CH') {
      return { zip: compact, country: 'CH', valid: true };
    }
    return { zip: compact, country: 'AT', valid: true };
  }

  if (/^\d{5}$/.test(compact)) {
    // 25xxx / 34xxx etc. with CZ city hint → Czech, not DE
    if (cc === 'CZ' || (compact.startsWith('25') || compact.startsWith('34') || compact.startsWith('61'))) {
      const spaced = `${compact.slice(0, 3)} ${compact.slice(3)}`;
      if (cc === 'CZ') {
        return { zip: spaced, country: 'CZ', valid: false, issue: `Tschechische PLZ (${spaced})` };
      }
    }
    return { zip: compact, country: 'DE', valid: true };
  }

  return { zip: raw, country: cc, valid: false, issue: `Ungültiges PLZ-Format (${raw})` };
}

/**
 * @param {string} city
 * @returns {string | null}
 */
export function inferCountryFromCity(city) {
  const c = String(city ?? '');
  for (const { pattern, country } of FOREIGN_CITY_PATTERNS) {
    if (pattern.test(c)) return country;
  }
  return null;
}

/** @param {string} plz @param {string} city */
function isWienPlzValid(plz, city) {
  if (!/wien|vienna/i.test(city)) return true;
  const n = parseInt(String(plz).trim(), 10);
  if (Number.isNaN(n)) return false;
  return (n >= 1010 && n <= 1239) || (n >= 1400 && n <= 1423);
}

/**
 * @param {string} zip
 * @param {string} city
 * @param {string} country
 * @returns {{ match: boolean | null, plzCity?: string, issue?: string }}
 */
export function checkPlzOrtMatch(zip, city, country) {
  const cc = String(country ?? '').toUpperCase();
  const foreign = inferCountryFromCity(city);
  if (foreign && foreign !== 'AT' && foreign !== 'DE' && foreign !== 'CH') {
    if (cc === 'AT' || cc === 'DE') {
      return { match: false, issue: `Ort „${city}" passt nicht zu ${cc}-PLZ` };
    }
    return { match: null };
  }

  const normalized = normalizePlz(zip, country);
  if (!normalized.valid) {
    return { match: false, issue: normalized.issue };
  }

  if (!isWienPlzValid(normalized.zip, city)) {
    return { match: false, issue: `PLZ ${normalized.zip} ist keine Wiener Postleitzahl` };
  }

  if (normalized.country === 'AT' || (cc === 'AT' && /^\d{4}$/.test(normalized.zip))) {
    const centroid = lookupAtPlz(normalized.zip);
    if (centroid?.city) {
      const ok = citiesMatch(city, centroid.city);
      return {
        match: ok,
        plzCity: centroid.city,
        issue: ok ? undefined : `PLZ ${normalized.zip} gehört zu ${centroid.city}, nicht ${city}`,
      };
    }
    return { match: null };
  }

  if (normalized.country === 'DE' || /^\d{5}$/.test(normalized.zip)) {
    const known = DE_PLZ_CITIES[normalized.zip];
    if (known) {
      const ok = citiesMatch(city, known);
      return {
        match: ok,
        plzCity: known,
        issue: ok ? undefined : `PLZ ${normalized.zip} gehört zu ${known}, nicht ${city}`,
      };
    }
    return { match: null };
  }

  return { match: null };
}

async function throttleNominatim() {
  const wait = NOMINATIM_DELAY_MS - (Date.now() - lastNominatimAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
}

/**
 * @param {string} query
 * @returns {Promise<{ lat: number, lng: number, zip?: string, city?: string, country?: string } | null>}
 */
export async function nominatimGeocode(query) {
  await throttleNominatim();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'at,de,ch');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0 (plz-reconciliation)' },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (!data?.length) return null;

  const hit = data[0];
  const addr = hit.address ?? {};
  const postcode = addr.postcode ?? '';
  const resultCity = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '';
  const cc = (addr.country_code ?? '').toUpperCase();

  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    zip: postcode ? String(postcode).trim() : undefined,
    city: resultCity || undefined,
    country: cc === 'AT' ? 'AT' : cc === 'DE' ? 'DE' : cc === 'CH' ? 'CH' : cc,
  };
}

/**
 * @param {object} input
 * @param {string} input.zip
 * @param {string} input.city
 * @param {string} [input.country]
 * @param {string} [input.name]
 * @param {'excel' | 'research'} [input.source]
 * @param {boolean} [input.useNominatim]
 * @returns {Promise<{
 *   zip: string,
 *   city: string,
 *   country: string,
 *   bundesland: string | null,
 *   plzWarning: boolean,
 *   plzWarningDetail?: string,
 *   plzCorrected?: boolean,
 *   originalZip?: string,
 * }>}
 */
export async function reconcileAddress({
  zip,
  city,
  country = 'AT',
  name = '',
  source = 'excel',
  useNominatim = false,
}) {
  let resolvedZip = String(zip ?? '').trim();
  let resolvedCity = String(city ?? '').trim();
  let resolvedCountry = String(country ?? 'AT').toUpperCase();
  const originalZip = resolvedZip;

  const foreign = inferCountryFromCity(resolvedCity);
  if (foreign) resolvedCountry = foreign;

  const normalized = normalizePlz(resolvedZip, resolvedCountry);
  if (normalized.valid) {
    resolvedZip = normalized.zip;
    if (!foreign && (normalized.country === 'AT' || normalized.country === 'DE')) {
      resolvedCountry = normalized.country;
    }
  }

  let plzWarning = false;
  let plzWarningDetail;
  let plzCorrected = false;

  let check = checkPlzOrtMatch(resolvedZip, resolvedCity, resolvedCountry);

  const shouldGeocode =
    useNominatim
    && (source === 'research' || check.match === false || !normalized.valid);

  if (shouldGeocode) {
    const query = name
      ? `${name}, ${resolvedZip} ${resolvedCity}, ${resolvedCountry}`
      : `${resolvedZip} ${resolvedCity}, ${resolvedCountry}`;
    try {
      const geo = await nominatimGeocode(query);
      if (geo) {
        const tryApplyGeo = () => {
          if (!geo.zip) return false;
          const geoNorm = normalizePlz(geo.zip, geo.country ?? resolvedCountry);
          if (!geoNorm.valid) return false;
          const geoCity = geo.city ?? resolvedCity;
          if (!citiesMatch(resolvedCity, geoCity)) return false;
          const afterCheck = checkPlzOrtMatch(geoNorm.zip, resolvedCity, geoNorm.country);
          if (afterCheck.match === false) return false;
          if (geoNorm.zip !== resolvedZip) {
            plzCorrected = true;
            resolvedZip = geoNorm.zip;
            resolvedCountry = geoNorm.country;
          }
          return true;
        };

        if (source === 'research') {
          tryApplyGeo();
          if (geo.city && !citiesMatch(resolvedCity, geo.city)) {
            resolvedCity = geo.city;
          }
        } else if (check.match === false || !normalized.valid) {
          tryApplyGeo();
        }
      }
    } catch {
      /* keep Excel values */
    }
  }

  const finalNorm = normalizePlz(resolvedZip, resolvedCountry);
  if (finalNorm.valid) {
    resolvedZip = finalNorm.zip;
    if (!foreign && (finalNorm.country === 'AT' || finalNorm.country === 'DE')) {
      resolvedCountry = finalNorm.country;
    }
  }

  check = checkPlzOrtMatch(resolvedZip, resolvedCity, resolvedCountry);
  if (check.match === false) {
    plzWarning = true;
    plzWarningDetail = check.issue;
  } else if (!finalNorm.valid) {
    plzWarning = true;
    plzWarningDetail = finalNorm.issue ?? 'PLZ-Format ungültig';
  }

  const bundesland = inferBundesland(resolvedZip, resolvedCountry, resolvedCity);

  return {
    zip: resolvedZip,
    city: resolvedCity,
    country: resolvedCountry,
    bundesland,
    plzWarning,
    plzWarningDetail,
    ...(plzCorrected ? { plzCorrected, originalZip } : {}),
  };
}

/**
 * Synchronous validation for UI (no Nominatim).
 * @param {string} zip
 * @param {string} city
 * @param {string} country
 */
export function validatePlzForUi(zip, city, country) {
  const normalized = normalizePlz(zip, country);
  const check = checkPlzOrtMatch(zip, city, country);
  const plzWarning = check.match === false || !normalized.valid;
  return {
    plzWarning,
    plzWarningDetail: check.issue ?? normalized.issue,
  };
}
