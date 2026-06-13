/**
 * Moldova MTender – public OCDS API (kein Key)
 * GET https://public.mtender.gov.md/tenders/cn?offset={ISO}&limit=N
 * Wichtig: ohne offset liefert die API nur älteste Datensätze (2018+).
 * Docs: https://mtendereprocurementsystem.github.io/MTender-Documentation/
 */

import { extractOcdsReleases, mapOcdsRelease } from './ocdsMapper.js';

const API_BASE = 'https://public.mtender.gov.md';
const API_PROXY = '/api/tenders/mtender';
const LIST_PATH = '/tenders/cn';
const LOOKBACK_DAYS = 30;
const LIST_LIMIT = 25;
const DETAIL_LIMIT = 15;

function apiRoot() {
  return typeof window !== 'undefined' ? API_PROXY : API_BASE;
}

function listUrl() {
  const offset = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const params = new URLSearchParams({ offset, limit: String(LIST_LIMIT) });
  return `${apiRoot()}${LIST_PATH}?${params}`;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`MTender ${res.status}`);
  return res.json();
}

function pickTenderRelease(data) {
  const releases = extractOcdsReleases(data);
  return releases.find((r) => r.tender?.title) ?? null;
}

async function fetchTenderByOcid(ocid) {
  const record = await fetchJson(`${apiRoot()}/tenders/${encodeURIComponent(ocid)}`);
  const packages = record.packages ?? [];
  for (const pkgUrl of packages) {
    const pkg = await fetchJson(pkgUrl.replace(/^http:\/\//, 'https://'));
    const release = pickTenderRelease(pkg);
    if (!release?.tender?.title) continue;
    const mapped = mapOcdsRelease(release, {
      idPrefix: 'mtender-md',
      country: 'Moldawien',
      countryCode: 'MDA',
      region: 'Europa',
      currency: 'MDL',
      sourcePlatform: 'MTender',
      urlBase: 'https://mtender.gov.md/en/tender/',
    });
    mapped.countryCode = 'MDA';
    mapped.sourceUrl = `https://mtender.gov.md/en/tender/${ocid}`;
    mapped.id = `mtender-md-${String(ocid).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`;
    return mapped;
  }
  return null;
}

export async function fetchMtenderMdTenders() {
  try {
    const list = await fetchJson(listUrl());
    const ocids = [...new Set((list.data ?? []).map((d) => d.ocid).filter(Boolean))].slice(0, DETAIL_LIMIT);
    const results = await Promise.allSettled(ocids.map(fetchTenderByOcid));
    const tenders = results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'mtender-md', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'MTender Fehler';
    console.warn('[MTender MD]', message);
    return { tenders: [], source: 'mtender-md-error', error: message, live: false };
  }
}
