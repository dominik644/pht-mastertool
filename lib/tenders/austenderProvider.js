/**
 * AusTender Australien – OCDS API (öffentlich, kein Key)
 * https://api.tenders.gov.au/ocds/findByDates/contractPublished/{from}/{to}
 * Docs: https://app.swaggerhub.com/apis/austender/ocds-api/1.1
 */

import { extractOcdsReleases } from './ocdsMapper.js';
import { inferIndustry, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/austender';
const API_DIRECT = 'https://api.tenders.gov.au/ocds';

function buildUrl() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const fmt = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const path = `/findByDates/contractLastModified/${fmt(from)}/${fmt(to)}`;
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return `${base}${path}`;
}

function mapRelease(release) {
  const contract = release.contracts?.[0];
  const tender = release.tender ?? {};
  const title = tender.title || contract?.title || release.description || 'AusTender Notice';
  const desc = tender.description || contract?.description || title;
  const value = tender.value?.amount || contract?.value?.amount || 80000;
  const currency = tender.value?.currency || contract?.value?.currency || 'AUD';
  const deadline = tender.tenderPeriod?.endDate || contract?.period?.endDate || release.date;
  const noticeId = contract?.id || release.id || release.ocid;
  const cpv = tender.classification?.id
    || contract?.items?.[0]?.classification?.id;

  return {
    id: `austender-${String(noticeId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Australien',
    countryCode: 'AUS',
    region: 'Oceania',
    budget: Number(value) || 80000,
    currency,
    sourcePlatform: 'AusTender',
    sourceUrl: noticeId
      ? `https://www.tenders.gov.au/Atm/ShowContract/Contract/Details/${noticeId}`
      : 'https://www.tenders.gov.au',
    publicationDate: parseIsoDate(release.date),
    submissionDeadline: parseIsoDate(deadline || release.date),
    description: typeof desc === 'string' ? desc.slice(0, 800) : String(title).slice(0, 300),
    industry: inferIndustry(`${title} ${desc}`),
    cpvCodes: cpv ? [String(cpv)] : [],
  };
}

export async function fetchAusTenderTenders() {
  try {
    const res = await fetch(buildUrl(), {
      headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 403) {
      console.warn('[AusTender] 403 Forbidden – API blockiert Serverless-IP; Proxy/Vercel prüfen');
      return { tenders: [], source: 'austender-blocked', live: false, error: 'AusTender 403' };
    }
    if (!res.ok) throw new Error(`AusTender OCDS ${res.status}`);
    const data = await res.json();
    const releases = extractOcdsReleases(data);
    const tenders = releases.map(mapRelease);
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'austender-ocds', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AusTender Fehler';
    console.warn('[AusTender]', message);
    return { tenders: [], source: 'austender-error', error: message, live: false };
  }
}
