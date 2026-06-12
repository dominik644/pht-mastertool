import { PHT_MATCH_KEYWORDS } from '../phtConfig.js';
import { cpvMatchesPHT } from './cpvMatch.js';
import { inferIndustry, parseIsoDate } from './utils.js';

export function matchesPHTText(text, cpvCodes = []) {
  const lower = String(text || '').toLowerCase();
  if (PHT_MATCH_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return cpvMatchesPHT(cpvCodes);
}

export function mapOcdsRelease(release, defaults = {}) {
  const tender = release.tender ?? {};
  const title = tender.title || release.description || defaults.title || 'Public Tender';
  const desc = tender.description || (typeof title === 'string' ? title : '');
  const value = tender.value?.amount || tender.minValue?.amount || 50000;
  const currency = tender.value?.currency || defaults.currency || 'EUR';
  const deadline = tender.tenderPeriod?.endDate || release.date;
  const pub = release.date || new Date().toISOString();
  const noticeId = release.id || release.ocid || `ocds-${Date.now()}`;
  const country = defaults.country || '—';
  const region = defaults.region || 'Europa';
  const platform = defaults.sourcePlatform || 'OCDS';
  const baseUrl = defaults.urlBase || '';

  return {
    id: `${defaults.idPrefix || 'ocds'}-${String(noticeId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: typeof title === 'string' ? title.slice(0, 300) : String(title).slice(0, 300),
    country,
    region,
    budget: Number(value) || 50000,
    currency,
    sourcePlatform: platform,
    sourceUrl: baseUrl ? `${baseUrl}${noticeId}` : (tender.documents?.[0]?.url || '#'),
    publicationDate: parseIsoDate(pub),
    submissionDeadline: parseIsoDate(deadline || pub),
    description: typeof desc === 'string' ? desc.slice(0, 800) : String(title).slice(0, 300),
    industry: inferIndustry(`${title} ${desc}`),
    cpvCodes: [...new Set(
      [
        tender.classification?.id,
        ...(tender.items ?? []).map((i) => i.classification?.id),
      ].filter(Boolean).map(String),
    )],
  };
}

export function extractOcdsReleases(data) {
  if (data.releases?.length) return data.releases;
  if (data.records?.length) {
    return data.records.flatMap((r) => r.releases ?? []);
  }
  return [];
}
