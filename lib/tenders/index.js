/**
 * Zentraler Tender-Loader – alle Live-Provider parallel
 */
import { DEMO_TENDERS } from '../../data/demoTenders.js';
import { fetchTEDTenders } from './tedProvider.js';
import { fetchUKContractsFinder } from './ukContractsFinderProvider.js';
import { fetchUKFindATender } from './ukFindATenderProvider.js';
import { getDACHTenders } from './dachProvider.js';
import { getAfricaTenders } from './africaProvider.js';
import { getMiddleEastTenders } from './middleEastProvider.js';
import { dedupeTenders, isExcluded, matchesPHT, normalizeTender } from './utils.js';

export { PHT_MATCH_KEYWORDS } from '../tedApi.js';

/**
 * @returns {Promise<{ tenders: object[], source: string, regions: string[], total: number, error?: string, isDemo: boolean, liveProviders: string[] }>}
 */
export async function loadAllTenders() {
  const liveProviders = [];
  const errors = [];

  const [ted, ukCf, ukFat] = await Promise.allSettled([
    fetchTEDTenders(),
    fetchUKContractsFinder(),
    fetchUKFindATender(),
  ]);

  let tenders = [];

  if (ted.status === 'fulfilled' && ted.value.tenders?.length) {
    tenders.push(...ted.value.tenders);
    if (ted.value.source === 'ted-api') liveProviders.push('TED API');
    else errors.push(ted.value.error);
  } else if (ted.status === 'rejected') {
    errors.push(ted.reason?.message || 'TED Fehler');
  }

  if (ukCf.status === 'fulfilled' && ukCf.value.tenders?.length) {
    tenders.push(...ukCf.value.tenders);
    liveProviders.push('Contracts Finder');
  } else if (ukCf.status === 'rejected') {
    errors.push(ukCf.reason?.message);
  }

  if (ukFat.status === 'fulfilled' && ukFat.value.tenders?.length) {
    tenders.push(...ukFat.value.tenders);
    liveProviders.push('Find a Tender');
  } else if (ukFat.status === 'rejected') {
    errors.push(ukFat.reason?.message);
  }

  let isDemo = liveProviders.length === 0;

  if (isDemo) {
    tenders = [...DEMO_TENDERS];
  }

  const regional = [
    ...getDACHTenders(),
    ...getAfricaTenders(),
    ...getMiddleEastTenders(),
  ];

  tenders = dedupeTenders([
    ...tenders.map(normalizeTender),
    ...regional.map(normalizeTender),
  ]).filter((t) => !isExcluded(t) && matchesPHT(t));

  const regions = [...new Set(tenders.map((t) => t.region))].sort();

  const source = liveProviders.length
    ? `Live: ${liveProviders.join(' + ')}${regional.length ? ' + Regional' : ''}`
    : 'Demo / Fallback aktiv';

  return {
    tenders,
    source,
    regions,
    total: tenders.length,
    error: errors.filter(Boolean).join('; ') || undefined,
    isDemo,
    liveProviders,
    tedSource: ted.status === 'fulfilled' ? ted.value.source : undefined,
  };
}

export function filterByRegion(tenders, region) {
  if (!region || region === 'all') return tenders;
  return tenders.filter((t) => t.region === region);
}

export function filterByCountry(tenders, country) {
  if (!country || country === 'all') return tenders;
  return tenders.filter((t) => t.country.toLowerCase().includes(country.toLowerCase()));
}
