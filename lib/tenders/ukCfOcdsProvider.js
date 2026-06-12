/**
 * UK Contracts Finder – OCDS Search API
 * https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search
 */

import { extractOcdsReleases, mapOcdsRelease } from './ocdsMapper.js';

const API_PROXY = '/api/uk?target=cf-ocds';
const API_DIRECT = 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search';

function getApiUrl() {
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return `${base}?limit=60&stages=tender`;
}

export async function fetchUKCfOcds() {
  const res = await fetch(getApiUrl(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Contracts Finder OCDS ${res.status}`);
  const data = await res.json();
  const releases = extractOcdsReleases(data);

  const tenders = releases
    .map((r) => {
      const noticeId = r.id || r.ocid;
      return mapOcdsRelease(r, {
        idPrefix: 'uk-cf-ocds',
        country: 'UK',
        region: 'UK',
        currency: 'GBP',
        sourcePlatform: 'Contracts Finder',
        urlBase: 'https://www.contractsfinder.service.gov.uk/Notice/',
      });
    });

  return { tenders, source: 'uk-cf-ocds', live: tenders.length > 0 };
}
