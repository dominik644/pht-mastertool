/**
 * Doffin Norwegen – Public API v2
 * https://betaapi.doffin.no/public/v2/search
 * API-Key: DOFFIN_API_KEY (Ocp-Apim-Subscription-Key)
 * Registrierung: https://dof-notices-prod-api.developer.azure-api.net/
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/doffin';
const API_DIRECT = 'https://betaapi.doffin.no/public/v2/search';

function getApiKey() {
  if (typeof process !== 'undefined' && process.env?.DOFFIN_API_KEY) {
    return process.env.DOFFIN_API_KEY;
  }
  return '';
}

function getSearchUrl(params) {
  const qs = new URLSearchParams(params).toString();
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return `${base}?${qs}`;
}

function mapHit(hit) {
  const title = hit.heading || hit.description?.slice(0, 120) || `Doffin ${hit.id}`;
  const buyer = hit.buyer?.map((b) => b.name).filter(Boolean).join(', ') || '';
  const value = hit.estimatedValue?.amount;
  const currency = hit.estimatedValue?.currencyCode || 'NOK';

  return {
    id: `doffin-${hit.id}`,
    title: title.slice(0, 300),
    country: 'Norwegen',
    countryCode: 'NOR',
    region: 'Europa',
    budget: value || 90000,
    currency,
    sourcePlatform: 'Doffin',
    sourceUrl: hit.doffinClassicUrl || `https://www.doffin.no/notice/${hit.id}`,
    publicationDate: parseIsoDate(hit.publicationDate || hit.issueDate),
    submissionDeadline: parseIsoDate(hit.deadline || hit.publicationDate),
    description: `${title}. Auftraggeber: ${buyer}. ${(hit.description || '').slice(0, 500)}`.slice(0, 800),
    industry: inferIndustry(`${title} ${hit.description || ''}`),
    cpvCodes: (hit.cpvCodes || []).map(String),
  };
}

async function searchPage(params) {
  const res = await fetch(getSearchUrl(params), {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(25000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Doffin API-Key fehlt oder ungültig (DOFFIN_API_KEY)');
  }
  if (!res.ok) throw new Error(`Doffin ${res.status}`);
  const data = await res.json();
  return (data.hits ?? []).map(mapHit);
}

export async function fetchDoffinTenders() {
  if (typeof window === 'undefined' && !getApiKey()) {
    console.warn('[Doffin] DOFFIN_API_KEY nicht gesetzt – Provider übersprungen');
    return { tenders: [], source: 'doffin', live: false };
  }

  const from = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const params = {
    status: 'ACTIVE',
    sortBy: 'PUBLICATION_DATE_DESC',
    numHitsPerPage: '40',
    page: '0',
    issueDateFrom: from,
  };

  try {
    const tenders = await searchPage(params);
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'doffin', live: unique.length > 0 };
  } catch (err) {
    if (err.message?.includes('API-Key')) {
      console.warn(`[Doffin] ${err.message}`);
      return { tenders: [], source: 'doffin', live: false };
    }
    throw err;
  }
}
