/**
 * Croatia EOJN – gefilterter Bulk aus EOJN OCDS (OCP Mirror)
 * Artefakt: public/data/bulk/eojn-hr.json (scripts/bulk-ingest-eojn.mjs)
 * Bulk wird täglich via GitHub Actions aktualisiert; Live-APIs bei jeder Suche separat.
 */

import {
  filterActiveTenders,
  getBulkFetchedAt,
  loadBulkJson,
} from './bulkLoader.js';

const STALE_MS = 36 * 3600 * 1000;

export async function fetchEojnHrBulkTenders() {
  const payload = await loadBulkJson('eojn-hr.json');
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
      source: 'eojn-hr-bulk',
      live: false,
      error: 'EOJN HR Bulk: kein Artefakt (npm run bulk:ingest)',
    };
  }

  return {
    tenders,
    source: 'eojn-hr-bulk',
    live: true,
    bulkFetchedAt: fetchedAt,
    bulkStale: stale,
    bulkStaleWarning: stale
      ? `EOJN HR Bulk älter als 36h (zuletzt ${fetchedAt}) – GitHub Action prüfen`
      : undefined,
    archiveNote: payload.archiveNote,
  };
}
