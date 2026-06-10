/**
 * Ukraine Prozorro – OpenProcurement API (OCDS)
 * https://public-api.prozorro.gov.ua/api/2.5
 */

import { matchesPHTText, mapOcdsRelease } from './ocdsMapper.js';

const API_PROXY = '/api/prozorro';
const API_DIRECT = 'https://public-api.prozorro.gov.ua/api/2.5';

function apiBase() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

async function fetchTenderOcds(id) {
  const res = await fetch(`${apiBase()}/tenders/${id}?opt_schema=ocds`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const release = data.releases?.[0] ?? data.data?.releases?.[0];
  if (!release) return null;
  const mapped = mapOcdsRelease(release, {
    idPrefix: 'ua-prozorro',
    country: 'Ukraine',
    region: 'Europa',
    currency: 'UAH',
    sourcePlatform: 'Prozorro',
    urlBase: 'https://prozorro.gov.ua/en/tender/',
  });
  mapped.sourceUrl = `https://prozorro.gov.ua/en/tender/${id}`;
  mapped.id = `ua-prozorro-${id}`;
  return mapped;
}

export async function fetchProzorroTenders() {
  const listRes = await fetch(`${apiBase()}/tenders?limit=25&descending=1`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!listRes.ok) throw new Error(`Prozorro ${listRes.status}`);
  const list = await listRes.json();
  const ids = (list.data ?? []).map((t) => t.id).filter(Boolean).slice(0, 25);

  const results = await Promise.allSettled(ids.map(fetchTenderOcds));
  const tenders = results
    .flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
    .filter((t) => matchesPHTText(`${t.title} ${t.description}`));

  return { tenders, source: 'prozorro', live: tenders.length > 0 };
}
