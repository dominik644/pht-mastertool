/**
 * TED Europa API v3 – echte EU-Ausschreibungen
 * https://api.ted.europa.eu/v3/notices/search
 */

const TED_API_URL = 'https://api.ted.europa.eu/v3/notices/search';
const TED_PROXY_URL = '/api/ted';

/** PHT-relevante Suchbegriffe (API + Client-Filter) */
export const PHT_MATCH_KEYWORDS = [
  'hygiene',
  'cleaning',
  'cip',
  'food production',
  'hospital',
  'sanitation',
  'disinfection',
  'reinigung',
  'desinfektion',
  'wasch',
  'pharma',
  'food',
];

const TED_SEARCH_QUERY =
  'FT~(hygiene OR cleaning OR hospital OR sanitation OR disinfection OR reinigung OR desinfektion)';

const TED_FIELDS = [
  'notice-title',
  'publication-number',
  'publication-date',
  'organisation-country-buyer',
  'place-of-performance-country-proc',
  'deadline-receipt-tender-date-lot',
  'description-glo',
  'estimated-value-lot',
  'classification-cpv',
  'links',
];

const COUNTRY_MAP = {
  DEU: 'Deutschland',
  AUT: 'Österreich',
  CHE: 'Schweiz',
  FRA: 'Frankreich',
  ITA: 'Italien',
  NLD: 'Niederlande',
  BEL: 'Belgien',
  POL: 'Polen',
  DNK: 'Dänemark',
  IRL: 'Irland',
  ESP: 'Spanien',
  PRT: 'Portugal',
  SWE: 'Schweden',
  FIN: 'Finnland',
  GBR: 'UK',
  GRC: 'Griechenland',
  CZE: 'Tschechien',
  ROU: 'Rumänien',
  HUN: 'Ungarn',
  SVK: 'Slowakei',
  BGR: 'Bulgarien',
  HRV: 'Kroatien',
  SVN: 'Slowenien',
  LTU: 'Litauen',
  LVA: 'Lettland',
  EST: 'Estland',
  LUX: 'Luxemburg',
  MLT: 'Malta',
  CYP: 'Zypern',
  NOR: 'Norwegen',
  ISL: 'Island',
  LIE: 'Liechtenstein',
  ZAF: 'Südafrika',
  KEN: 'Kenia',
  EGY: 'Ägypten',
  MAR: 'Marokko',
  NGA: 'Nigeria',
  ARE: 'VAE',
  SAU: 'Saudi-Arabien',
  QAT: 'Katar',
  ISR: 'Israel',
  TUR: 'Türkei',
};

const DACH_CODES = new Set(['DEU', 'AUT', 'CHE']);
const EU_CODES = new Set([
  'DEU', 'AUT', 'FRA', 'ITA', 'NLD', 'BEL', 'POL', 'DNK', 'IRL', 'ESP', 'PRT',
  'SWE', 'FIN', 'GRC', 'CZE', 'ROU', 'HUN', 'SVK', 'BGR', 'HRV', 'SVN', 'LTU',
  'LVA', 'EST', 'LUX', 'MLT', 'CYP',
]);

const AFRICA_CODES = new Set(['ZAF', 'KEN', 'EGY', 'MAR', 'NGA', 'GHA', 'TUN', 'DZA']);
const MIDDLE_EAST_CODES = new Set(['ARE', 'SAU', 'QAT', 'ISR', 'TUR', 'BHR', 'OMN', 'KWT', 'JOR']);

/** USA + Nordamerika */
const EXCLUDED_COUNTRY_CODES = new Set(['USA', 'CAN', 'MEX']);

/** Asien-Pazifik – explizit ausgeschlossen */
const ASIA_PACIFIC_CODES = new Set([
  'AUS', 'CHN', 'JPN', 'IND', 'SGP', 'KOR', 'NZL', 'MYS', 'THA', 'VNM', 'IDN',
  'PHL', 'TWN', 'HKG', 'PAK', 'BGD', 'LKA', 'MMR', 'NPL',
]);

const ALLOWED_REGIONS = new Set(['Europa', 'DACH', 'UK', 'Afrika', 'Middle East']);

/** Fallback-Daten im TED-Format wenn API nicht erreichbar */
export const FALLBACK_TENDERS = [
  {
    id: 'ted-fallback-816821',
    title: 'Industrial hygiene stations for food processing plant',
    country: 'Deutschland',
    region: 'DACH',
    budget: 285000,
    currency: 'EUR',
    sourcePlatform: 'TED',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/816821-2024',
    publicationDate: '2026-05-28',
    submissionDeadline: '2026-07-18',
    description: 'Complete hygiene entrance systems including hand disinfection and sole cleaning for meat processing.',
    industry: 'Food',
    cpvCodes: ['42996600', '44614300'],
  },
  {
    id: 'ted-fallback-792341',
    title: 'Low-pressure cleaning system for pharmaceutical GMP production',
    country: 'Frankreich',
    region: 'Europa',
    budget: 420000,
    currency: 'EUR',
    sourcePlatform: 'TED',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/792341-2024',
    publicationDate: '2026-05-15',
    submissionDeadline: '2026-06-28',
    description: 'Niederdruck-Reinigungssystem für GMP-konforme Pharma-Produktion.',
    industry: 'Pharma',
    cpvCodes: ['42996600'],
  },
  {
    id: 'ted-fallback-845102',
    title: 'Complete industrial washing plant for dairy processing',
    country: 'Dänemark',
    region: 'Europa',
    budget: 890000,
    currency: 'EUR',
    sourcePlatform: 'TED',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/845102-2024',
    publicationDate: '2026-05-10',
    submissionDeadline: '2026-08-20',
    description: 'Industrial cleaning plant with CIP system for dairy processing factory.',
    industry: 'Food',
    cpvCodes: ['42996600', '44617000'],
  },
  {
    id: 'ted-fallback-834567',
    title: 'COMBI hygiene stations for university hospital extension',
    country: 'Italien',
    region: 'Europa',
    budget: 92000,
    currency: 'EUR',
    sourcePlatform: 'TED',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/834567-2024',
    publicationDate: '2026-06-07',
    submissionDeadline: '2026-07-08',
    description: 'Multiple COMBI hygiene stations for university hospital new build.',
    industry: 'Hospital',
    cpvCodes: ['33192120', '33790000'],
  },
  {
    id: 'ted-fallback-1902',
    title: 'Reinigungsanlage Pharma-Produktion Wien',
    country: 'Österreich',
    region: 'DACH',
    budget: 380000,
    currency: 'EUR',
    sourcePlatform: 'TED',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/1902-2026',
    publicationDate: '2026-06-01',
    submissionDeadline: '2026-07-20',
    description: 'CIP-Reinigungssystem für Pharma-Werk in Wien.',
    industry: 'Pharma',
    cpvCodes: ['42996600'],
  },
];

function firstValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function localizeText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.deu ?? value.eng ?? value.DEU ?? value.ENG ?? Object.values(value)[0] ?? '';
  }
  return String(value);
}

function parseDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const raw = String(firstValue(value));
  return raw.replace(/\+.*$/, '').replace(/Z$/, '').slice(0, 10);
}

function mapCountryCode(code) {
  if (!code) return null;
  const upper = String(code).toUpperCase().slice(0, 3);
  return { code: upper, name: COUNTRY_MAP[upper] ?? upper };
}

function resolveRegion(countryCode) {
  if (DACH_CODES.has(countryCode)) return 'DACH';
  if (countryCode === 'GBR') return 'UK';
  if (EU_CODES.has(countryCode) || countryCode === 'NOR' || countryCode === 'ISL' || countryCode === 'LIE') {
    return 'Europa';
  }
  if (AFRICA_CODES.has(countryCode)) return 'Afrika';
  if (MIDDLE_EAST_CODES.has(countryCode)) return 'Middle East';
  return null;
}

function isCountryExcluded(countryCode) {
  if (!countryCode) return true;
  const code = countryCode.toUpperCase();
  if (EXCLUDED_COUNTRY_CODES.has(code)) return true;
  if (ASIA_PACIFIC_CODES.has(code)) return true;
  return false;
}

function isRegionAllowed(region) {
  return region && ALLOWED_REGIONS.has(region);
}

function inferIndustry(text) {
  const lower = text.toLowerCase();
  if (lower.includes('pharma') || lower.includes('gmp')) return 'Pharma';
  if (lower.includes('hospital') || lower.includes('medical') || lower.includes('nursing')) return 'Hospital';
  if (lower.includes('food') || lower.includes('meat') || lower.includes('dairy') || lower.includes('beverage')) {
    return 'Food';
  }
  if (lower.includes('production') || lower.includes('industrial')) return 'Production';
  return 'Public';
}

function extractKeywords(text) {
  const lower = text.toLowerCase();
  return PHT_MATCH_KEYWORDS.filter((kw) => lower.includes(kw));
}

function matchesPHTFilter(tender) {
  const text = `${tender.title} ${tender.description} ${(tender.cpvCodes || []).join(' ')}`.toLowerCase();
  return PHT_MATCH_KEYWORDS.some((kw) => text.includes(kw));
}

function buildSourceUrl(notice) {
  const pubNumber = notice['publication-number'];
  const links = notice.links?.html;
  if (links?.DEU) return links.DEU;
  if (links?.ENG) return links.ENG;
  if (pubNumber) return `https://ted.europa.eu/en/notice/-/detail/${pubNumber}`;
  return 'https://ted.europa.eu';
}

/**
 * @param {Record<string, unknown>} notice
 * @returns {object|null}
 */
export function parseTEDNotice(notice) {
  try {
    const pubNumber = notice['publication-number'];
    if (!pubNumber) return null;

    const countryCode =
      firstValue(notice['organisation-country-buyer']) ??
      firstValue(notice['place-of-performance-country-proc']);

    if (isCountryExcluded(countryCode)) return null;

    const countryInfo = mapCountryCode(countryCode);
    if (!countryInfo) return null;

    const region = resolveRegion(countryInfo.code);
    if (!isRegionAllowed(region)) return null;

    const title = localizeText(notice['notice-title']) || 'EU Ausschreibung';
    const description =
      localizeText(notice['description-glo']) || title;

    const budgetRaw = Number(firstValue(notice['estimated-value-lot'])) || 0;
    const budget = budgetRaw > 0 ? Math.round(budgetRaw) : 50000;

    const cpvCodes = [...new Set((notice['classification-cpv'] || []).map(String))];

    const tender = {
      id: `ted-${pubNumber}`,
      title: title.slice(0, 300),
      country: countryInfo.name,
      countryCode: countryInfo.code,
      region,
      budget,
      currency: 'EUR',
      sourcePlatform: 'TED',
      sourceUrl: buildSourceUrl(notice),
      publicationDate: parseDate(notice['publication-date']),
      submissionDeadline: parseDate(notice['deadline-receipt-tender-date-lot']),
      description: description.slice(0, 800),
      industry: inferIndustry(`${title} ${description}`),
      cpvCodes,
      keywords: extractKeywords(`${title} ${description}`),
    };

    return matchesPHTFilter(tender) ? tender : null;
  } catch {
    return null;
  }
}

function getApiUrl() {
  if (typeof window !== 'undefined') return TED_PROXY_URL;
  return TED_API_URL;
}

/**
 * @param {{ limit?: number, scope?: string }} [options]
 */
export async function fetchTEDNotices(options = {}) {
  const { limit = 50, scope = 'ACTIVE' } = options;

  const body = {
    query: TED_SEARCH_QUERY,
    fields: TED_FIELDS,
    limit,
    scope,
    page: 1,
    paginationMode: 'PAGE_NUMBER',
  };

  const url = getApiUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`TED API ${response.status}: ${errText.slice(0, 120)}`);
  }

  const data = await response.json();
  const notices = data.notices ?? data.results ?? [];

  return {
    notices,
    total: data.totalNoticeCount ?? notices.length,
  };
}

/**
 * Lädt echte TED-Ausschreibungen mit PHT-Filter und Regionsfilter.
 * @returns {Promise<{ tenders: object[], source: string, total: number, error?: string }>}
 */
export async function loadTendersFromTED() {
  try {
    const { notices, total } = await fetchTEDNotices({ limit: 50 });

    const tenders = notices
      .map((n) => parseTEDNotice(n))
      .filter(Boolean);

    if (tenders.length === 0) {
      throw new Error('TED API: keine passenden Ausschreibungen');
    }

    return {
      tenders,
      source: 'ted-api',
      total,
      apiTotal: total,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TED API Fehler';
    const fallback = FALLBACK_TENDERS.map((t) => ({
      ...t,
      keywords: extractKeywords(`${t.title} ${t.description}`),
    }));

    return {
      tenders: fallback,
      source: 'ted-fallback',
      total: fallback.length,
      error: message,
    };
  }
}

export {
  ALLOWED_REGIONS,
  ASIA_PACIFIC_CODES,
  EXCLUDED_COUNTRY_CODES,
  isCountryExcluded,
  isRegionAllowed,
  matchesPHTFilter,
  resolveRegion,
};
