/**
 * UK Find a Tender – OCDS Release Packages API
 * https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
 */

import { PHT_MATCH_KEYWORDS } from '../tedApi.js';

const API_PROXY = '/api/uk-find-tender';
const API_DIRECT = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages';

function getApiUrl() {
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return `${base}?limit=80&stages=tender`;
}

function matchesPHT(text) {
  const lower = text.toLowerCase();
  return PHT_MATCH_KEYWORDS.some((kw) => lower.includes(kw));
}

function mapRelease(release) {
  const tender = release.tender ?? {};
  const title = tender.title || release.description || 'UK Tender Notice';
  const desc = tender.description || title;
  const buyer = release.buyer?.name || release.parties?.find((p) => p.roles?.includes('buyer'))?.name || 'UK';
  const value = tender.value?.amount || tender.minValue?.amount || 50000;
  const currency = tender.value?.currency || 'GBP';
  const deadline = tender.tenderPeriod?.endDate || release.date;
  const pub = release.date || new Date().toISOString();
  const ocid = release.ocid || release.id;
  const noticeId = release.id?.replace(/^ocds-[^-]+-/, '') || ocid;

  return {
    id: `uk-fat-${noticeId}`,
    title: typeof title === 'string' ? title : String(title),
    country: 'UK',
    region: 'UK',
    budget: Number(value) || 50000,
    currency,
    sourcePlatform: 'Find a Tender',
    sourceUrl: `https://www.find-tender.service.gov.uk/Notice/${noticeId}`,
    publicationDate: String(pub).slice(0, 10),
    submissionDeadline: String(deadline || pub).slice(0, 10),
    description: typeof desc === 'string' ? desc.slice(0, 800) : title,
    industry: inferIndustry(`${title} ${desc}`),
    cpvCodes: (tender.classification?.id ? [tender.classification.id] : []),
  };
}

function inferIndustry(text) {
  const l = String(text).toLowerCase();
  if (l.includes('hospital') || l.includes('medical')) return 'Hospital';
  if (l.includes('food')) return 'Food';
  return 'Public';
}

export async function fetchUKFindATender() {
  const res = await fetch(getApiUrl(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Find a Tender ${res.status}`);
  const data = await res.json();
  const releases = data.releases ?? data.records?.flatMap((r) => r.releases ?? []) ?? [];

  const tenders = releases
    .map(mapRelease)
    .filter((t) => matchesPHT(`${t.title} ${t.description}`));

  return { tenders, source: 'uk-find-a-tender', live: tenders.length > 0 };
}
