/**
 * e-Zamówienia Polen – BZP WebService (öffentlich, kein Key)
 * GET https://ezamowienia.gov.pl/mo-board/api/v1/notice
 * Pflichtparameter: NoticeType, PublicationDateFrom, PublicationDateTo
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/ezamowienia';
const API_DIRECT = 'https://ezamowienia.gov.pl/mo-board/api/v1/notice';

function getSearchUrl(params) {
  const qs = new URLSearchParams(params).toString();
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return `${base}?${qs}`;
}

function parseCpv(cpvCode) {
  if (!cpvCode) return [];
  const m = String(cpvCode).match(/(\d{8}-\d)/);
  return m ? [m[1]] : [];
}

function mapNotice(n) {
  const title = n.orderObject || `BZP ${n.noticeNumber || n.tenderId}`;
  const cpv = parseCpv(n.cpvCode);

  return {
    id: `ezam-${(n.tenderId || n.noticeNumber || '').replace(/[^a-zA-Z0-9-]/g, '')}`,
    title: title.slice(0, 300),
    country: 'Polen',
    countryCode: 'POL',
    region: 'Europa',
    budget: 70000,
    currency: 'PLN',
    sourcePlatform: 'e-Zamówienia BZP',
    sourceUrl: n.tenderId
      ? `https://ezamowienia.gov.pl/mo-client-board/bzp/notice-details/${encodeURIComponent(n.tenderId)}`
      : 'https://ezamowienia.gov.pl',
    publicationDate: parseIsoDate(n.publicationDate),
    submissionDeadline: parseIsoDate(n.submittingOffersDate || n.publicationDate),
    description: `${title}. Zamawiający: ${n.organizationName || '—'}, ${n.organizationCity || ''}. CPV: ${n.cpvCode || '—'}`.slice(0, 800),
    industry: inferIndustry(`${title} ${n.cpvCode || ''}`),
    cpvCodes: cpv,
  };
}

function buildParams() {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  return {
    PageSize: '50',
    PageNumber: '1',
    NoticeType: 'ContractNotice',
    PublicationDateFrom: from,
    PublicationDateTo: to,
  };
}

export async function fetchEzamowieniaTenders() {
  try {
    const res = await fetch(getSearchUrl(buildParams()), {
      headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`e-Zamówienia ${res.status}`);

    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items ?? data.notices ?? []);
    const tenders = list.map(mapNotice);
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'ezamowienia-bzp', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'e-Zamówienia Fehler';
    console.warn('[e-Zamówienia]', message);
    return { tenders: [], source: 'ezamowienia-error', error: message, live: false };
  }
}
