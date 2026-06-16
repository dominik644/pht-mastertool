/**
 * Italy ANAC – gefilterter Bulk aus CKAN + monatliche OCDS-Release-Pakete
 * Artefakt: public/data/bulk/anac-it.json (scripts/bulk-ingest-anac.mjs)
 *
 * CKAN-API (/opendata/api/3/action/*) erreichbar mit Browser-User-Agent.
 * Live-OCDS-API (/opendata/ocds/api/releases) → 404. Monats-Bulk ~700 MB.
 * Kein Partner-Whitelist nötig; WAF blockiert Bot-User-Agents.
 */

import {
  filterActiveTenders,
  getBulkFetchedAt,
  loadBulkJson,
} from './bulkLoader.js';

const STALE_MS = 36 * 3600 * 1000;

export async function fetchAnacItTenders() {
  const payload = await loadBulkJson('anac-it.json');
  const fetchedAt = getBulkFetchedAt(payload);
  const tenders = payload?.deadlineRelaxed
    ? (payload.tenders ?? [])
    : payload?.tenders?.length
      ? filterActiveTenders(payload.tenders)
      : [];
  const stale = !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > STALE_MS;

  if (!tenders.length) {
    return {
      tenders: [],
      source: 'anac-it-bulk',
      live: false,
      error: 'ANAC IT Bulk: kein Artefakt (npm run bulk:ingest)',
    };
  }

  return {
    tenders,
    source: 'anac-it-bulk',
    live: true,
    license: payload.license || 'CC BY 4.0 (ANAC Open Data)',
    bulkFetchedAt: fetchedAt,
    bulkStale: stale,
    bulkStaleWarning: stale
      ? `ANAC IT Bulk älter als 36h (zuletzt ${fetchedAt}) – GitHub Action prüfen`
      : undefined,
    archiveNote: payload.archiveNote,
  };
}
