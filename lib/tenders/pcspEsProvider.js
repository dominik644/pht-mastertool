/**
 * Spain PCSP – gefilterter Bulk aus monatlichen CODICE/Atom-ZIPs (sindicación 643)
 * Artefakt: public/data/bulk/pcsp-es.json (scripts/bulk-ingest-pcsp.mjs)
 *
 * Live-Atom-Syndication leitet auf HTML um; Monats-ZIPs mit Browser-User-Agent erreichbar.
 * Kein PCSP-Partner-Whitelist nötig.
 */

import {
  filterActiveTenders,
  getBulkFetchedAt,
  loadBulkJson,
} from './bulkLoader.js';

const STALE_MS = 36 * 3600 * 1000;

export async function fetchPcspEsTenders() {
  const payload = await loadBulkJson('pcsp-es.json');
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
      source: 'pcsp-es-bulk',
      live: false,
      error: 'PCSP ES Bulk: kein Artefakt (npm run bulk:ingest)',
    };
  }

  return {
    tenders,
    source: 'pcsp-es-bulk',
    live: true,
    license: payload.license || 'Datos abiertos – Ministerio de Hacienda / PLACSP',
    bulkFetchedAt: fetchedAt,
    bulkStale: stale,
    bulkStaleWarning: stale
      ? `PCSP ES Bulk älter als 36h (zuletzt ${fetchedAt}) – GitHub Action prüfen`
      : undefined,
    archiveNote: payload.archiveNote,
  };
}
