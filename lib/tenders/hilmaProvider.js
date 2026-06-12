/**
 * HILMA Finnland – AVP Read API (eForms search)
 * POST https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search
 * API-Key: HILMA_API_KEY (Header Ocp-Apim-Subscription-Key)
 * Registrierung: https://hns-hilma-prod-apim.developer.azure-api.net/ → Products → avp-read
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/hilma';
const API_DIRECT = 'https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search';

function getApiKey() {
  if (typeof process !== 'undefined' && process.env?.HILMA_API_KEY) {
    return process.env.HILMA_API_KEY;
  }
  return '';
}

function getSearchUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function pickTitle(n) {
  return n.titleFi || n.titleEn || n.titleSv || `HILMA ${n.noticeId}`;
}

function mapNotice(n) {
  const title = pickTitle(n);
  const cpv = n.cpvCodes
    ? String(n.cpvCodes).split(/[,;]/).map((c) => c.trim()).filter(Boolean)
    : [];

  return {
    id: `hilma-${n.noticeId}`,
    title: title.slice(0, 300),
    country: 'Finnland',
    countryCode: 'FIN',
    region: 'Europa',
    budget: n.estimatedValue || 70000,
    currency: 'EUR',
    sourcePlatform: 'HILMA',
    sourceUrl: n.procurementDocumentsUrl
      || `https://www.hankintailmoitukset.fi/fi/notice/${n.eFormsId || n.noticeId}`,
    publicationDate: parseIsoDate(n.datePublished),
    submissionDeadline: parseIsoDate(n.expirationDate || n.datePublished),
    description: `${title}. Hankintayksikkö: ${n.organisationNameFi || '—'}. ${(n.descriptionFi || '').slice(0, 500)}`.slice(0, 800),
    industry: inferIndustry(`${title} ${n.descriptionFi || ''}`),
    cpvCodes: cpv,
  };
}

function buildSearchBody() {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  return {
    search: '*',
    top: 50,
    count: true,
    orderby: 'datePublished desc',
    searchMode: 'any',
    queryType: 'simple',
    filter: `mainType eq 'ContractNotices' and datePublished ge ${cutoff}`,
    select: 'noticeId,titleFi,titleEn,titleSv,organisationNameFi,cpvCodes,datePublished,expirationDate,estimatedValue,mainType,eFormsId,procurementDocumentsUrl,descriptionFi',
  };
}

export async function fetchHilmaTenders() {
  if (typeof window === 'undefined' && !getApiKey()) {
    console.warn('[HILMA] HILMA_API_KEY nicht gesetzt – Provider übersprungen');
    return { tenders: [], source: 'hilma', live: false };
  }

  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' };
  if (typeof window === 'undefined' && getApiKey()) {
    headers['Ocp-Apim-Subscription-Key'] = getApiKey();
  }

  try {
    const res = await fetch(getSearchUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(buildSearchBody()),
      signal: AbortSignal.timeout(25000),
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('[HILMA] HILMA_API_KEY fehlt oder ungültig');
      return { tenders: [], source: 'hilma', live: false };
    }
    if (!res.ok) throw new Error(`HILMA ${res.status}`);

    const data = await res.json();
    const tenders = (data.value ?? []).map(mapNotice);
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'hilma', live: unique.length > 0 };
  } catch (err) {
    if (err.message?.includes('401') || err.message?.includes('403')) {
      return { tenders: [], source: 'hilma', live: false };
    }
    throw err;
  }
}
