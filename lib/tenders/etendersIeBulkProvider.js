/**
 * Ireland eTenders – gefilterter Bulk aus data.gov.ie CSV (CC BY 4.0)
 * Artefakt: public/data/bulk/etenders-ie.json (scripts/bulk-ingest-ireland.mjs)
 * Bulk wird täglich via GitHub Actions aktualisiert; Live-APIs bei jeder Suche separat.
 */

import {
  filterActiveTenders,
  getBulkFetchedAt,
  loadBulkJson,
} from './bulkLoader.js';

const STALE_MS = 36 * 3600 * 1000;

export async function fetchEtendersIeBulkTenders() {
  const payload = await loadBulkJson('etenders-ie.json');
  const fetchedAt = getBulkFetchedAt(payload);
  const tenders = payload?.tenders?.length ? filterActiveTenders(payload.tenders) : [];
  const stale = !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > STALE_MS;

  if (!tenders.length) {
    return {
      tenders: [],
      source: 'etenders-ie-bulk',
      live: false,
      error: 'eTenders IE Bulk: kein Artefakt (npm run bulk:ingest)',
    };
  }

  return {
    tenders,
    source: 'etenders-ie-bulk',
    live: true,
    license: 'CC BY 4.0 (data.gov.ie)',
    bulkFetchedAt: fetchedAt,
    bulkStale: stale,
    bulkStaleWarning: stale
      ? `eTenders IE Bulk älter als 36h (zuletzt ${fetchedAt}) – GitHub Action prüfen`
      : undefined,
  };
}
