/**
 * Ireland eTenders – gefilterter Bulk aus data.gov.ie CSV (CC BY 4.0)
 * Artefakt: public/data/bulk/etenders-ie.json (scripts/bulk-ingest-ireland.mjs)
 * Live-API auf etenders.gov.ie existiert nicht (SPA, kein OCDS-Endpoint).
 */

import { loadBulkTenders } from './bulkLoader.js';

export async function fetchEtendersIeBulkTenders() {
  const tenders = await loadBulkTenders('etenders-ie.json');

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
  };
}
