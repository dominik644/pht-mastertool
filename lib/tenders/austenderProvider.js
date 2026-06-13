/**
 * AusTender Australien – OCDS API (öffentlich, kein Key)
 * https://api.tenders.gov.au/ocds/findByDates/contractPublished/{from}/{to}
 * Docs: https://app.swaggerhub.com/apis/austender/ocds-api/1.1
 */

import { extractOcdsReleases } from './ocdsMapper.js';
import { inferIndustry, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/austender';
const API_DIRECT = 'https://api.tenders.gov.au/ocds';

const DATE_PATHS = [
  'findByDates/contractPublished',
  'findByDates/contractLastModified',
];

function fmtOcdsDate(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildUrls() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const fromStr = fmtOcdsDate(from);
  const toStr = fmtOcdsDate(to);
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return DATE_PATHS.map((p) => `${base}/${p}/${fromStr}/${toStr}`);
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

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'PHT-Mastertool/1.0',
  Referer: 'https://www.tenders.gov.au/',
  Origin: 'https://www.tenders.gov.au',
};

async function fetchReleases(url) {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 403) return { blocked: true };
  if (!res.ok) return { error: `AusTender OCDS ${res.status}` };
  const data = await res.json();
  return { releases: extractOcdsReleases(data) };
}

export async function fetchAusTenderTenders() {
  try {
    const urls = buildUrls();
    let lastError;
    let blocked = false;

    for (const url of urls) {
      const result = await fetchReleases(url);
      if (result.blocked) {
        blocked = true;
        continue;
      }
      if (result.error) {
        lastError = result.error;
        continue;
      }
      const tenders = (result.releases ?? []).map(mapRelease);
      const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
      if (unique.length > 0) {
        return { tenders: unique, source: 'austender-ocds', live: true };
      }
    }

    if (blocked) {
      console.warn('[AusTender] 403 Forbidden – API blockiert Serverless-IP; Referer-Header gesetzt');
      return { tenders: [], source: 'austender-blocked', live: false, error: 'AusTender 403' };
    }
    throw new Error(lastError || 'AusTender: keine Releases');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AusTender Fehler';
    console.warn('[AusTender]', message);
    return { tenders: [], source: 'austender-error', error: message, live: false };
  }
}
