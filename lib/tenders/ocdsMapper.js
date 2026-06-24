import { PHT_MATCH_KEYWORDS } from '../phtConfig.js';
import { matchesPriceListKeywords } from '../priceListKeywords.js';
import { collectOcdsCpvCodes, cpvMatchesEquipment, cpvMatchesPHT, cpvMatchesServiceOnly } from './cpvMatch.js';
import {
  hasCoreProductSignal,
  hasEquipmentSignal,
  hasStrongHygieneContext,
  isServiceOnlyCleaning,
  PHT_WEAK_CONTEXT_KEYWORDS,
  textHasExclusion,
  textHasNonPHTServiceExclusion,
} from '../phtMatchRules.js';
import { inferIndustry, parseIsoDate } from './utils.js';

export function matchesPHTText(text, cpvCodes = []) {
  const lower = String(text || '').toLowerCase();
  if (textHasExclusion(lower)) return false;
  if (textHasNonPHTServiceExclusion(lower, cpvCodes)) return false;
  if (isServiceOnlyCleaning(lower, cpvCodes, cpvMatchesServiceOnly, cpvMatchesEquipment)) return false;
  if (hasEquipmentSignal(lower) || hasCoreProductSignal(lower)) return true;
  if (cpvMatchesPHT(cpvCodes, lower)) return true;
  if (matchesPriceListKeywords(lower)) return true;

  const matchedConfig = PHT_MATCH_KEYWORDS.filter((kw) => lower.includes(kw));
  if (!matchedConfig.length) return false;

  const onlyWeakContext = matchedConfig.every((kw) => PHT_WEAK_CONTEXT_KEYWORDS.includes(kw));
  if (onlyWeakContext) return false;
  if (!hasStrongHygieneContext(lower) && !hasCoreProductSignal(lower)) return false;
  return true;
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
    cpvCodes: collectOcdsCpvCodes(tender),
  };
}

export function extractOcdsReleases(data) {
  if (data.releases?.length) return data.releases;
  if (data.records?.length) {
    return data.records.flatMap((r) => r.releases ?? []);
  }
  return [];
}
