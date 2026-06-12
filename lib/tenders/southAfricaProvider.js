/**
 * South Africa eTenders – OCDS API
 * https://ocds-api.etenders.gov.za/
 */

import { extractOcdsReleases, mapOcdsRelease } from './ocdsMapper.js';

const API_PROXY = '/api/tenders/za-etenders';
const API_DIRECT = 'https://ocds-api.etenders.gov.za/api/OCDSReleases';

function buildUrl() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 21);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const qs = `dateFrom=${fmt(from)}&dateTo=${fmt(to)}&pageNumber=1&pageSize=100`;
  const base = typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
  return `${base}?${qs}`;
}

export async function fetchSouthAfricaTenders() {
  const res = await fetch(buildUrl(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`eTenders ZA ${res.status}`);
  const data = await res.json();
  const releases = extractOcdsReleases(data).length ? extractOcdsReleases(data) : (Array.isArray(data) ? data : []);

  const tenders = releases
    .map((r) => mapOcdsRelease(r, {
      idPrefix: 'za-etenders',
      country: 'Südafrika',
      region: 'Afrika',
      currency: 'ZAR',
      sourcePlatform: 'eTenders RSA',
      urlBase: 'https://www.etenders.gov.za/Home/TenderDetails?tenderId=',
    }));

  return { tenders, source: 'za-etenders', live: tenders.length > 0 };
}
