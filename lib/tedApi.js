/**
 * TED Europa API v3 – echte EU-Ausschreibungen
 * https://api.ted.europa.eu/v3/notices/search
 */
import {
  ALLOWED_REGIONS,
  ASIA_CODES,
  USA_CODES,
  mapCountryCode,
  isCountryExcluded,
  isRegionAllowed,
  resolveRegion,
} from './tenders/regions.js';

const TED_API_URL = 'https://api.ted.europa.eu/v3/notices/search';
const TED_PROXY_URL = '/api/ted';

import {
  PHT_MATCH_KEYWORDS,
  TED_SEARCH_QUERIES,
  TED_CPV_QUERIES,
  TED_DACH_QUERIES,
} from './phtConfig.js';

export { PHT_MATCH_KEYWORDS };

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

const EXCLUDED_COUNTRY_CODES = USA_CODES;
const ASIA_PACIFIC_CODES = ASIA_CODES;

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

    if (!countryCode || isCountryExcluded(countryCode)) return null;

    const countryInfo = mapCountryCode(countryCode);
    if (!countryInfo) return null;

    const region = resolveRegion(countryInfo.code);
    if (!region || !isRegionAllowed(region)) return null;

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
async function fetchTEDNoticesPage(query, limit, scope = 'ACTIVE') {
  const url = getApiUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query,
      fields: TED_FIELDS,
      limit,
      scope,
      page: 1,
      paginationMode: 'PAGE_NUMBER',
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`TED API ${response.status}: ${errText.slice(0, 120)}`);
  }

  const data = await response.json();
  return {
    notices: data.notices ?? data.results ?? [],
    total: data.totalNoticeCount ?? 0,
  };
}

export async function fetchTEDNotices(options = {}) {
  const { limit = 50, scope = 'ACTIVE' } = options;
  const allQueries = [...TED_SEARCH_QUERIES, ...TED_CPV_QUERIES, ...TED_DACH_QUERIES];
  const perQuery = Math.max(10, Math.ceil(limit / allQueries.length));
  const batches = await Promise.allSettled(
    allQueries.map((query) => fetchTEDNoticesPage(query, perQuery, scope)),
  );

  const seen = new Set();
  const notices = [];
  let total = 0;

  for (const batch of batches) {
    if (batch.status !== 'fulfilled') continue;
    total += batch.value.total;
    for (const notice of batch.value.notices) {
      const key = notice['publication-number'];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      notices.push(notice);
    }
  }

  return { notices: notices.slice(0, limit), total: total || notices.length };
}

/**
 * Lädt echte TED-Ausschreibungen mit PHT-Filter und Regionsfilter.
 * @returns {Promise<{ tenders: object[], source: string, total: number, error?: string }>}
 */
export async function loadTendersFromTED() {
  try {
    const { notices, total } = await fetchTEDNotices({ limit: 200 });

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
    return {
      tenders: [],
      source: 'ted-error',
      total: 0,
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
