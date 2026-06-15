/**
 * OpenTender HU/RO/(PL) – Bulk-OCDS aus public/data/bulk/
 *
 * Lizenz: CC BY-NC-SA 4.0 (OpenTender/OCP) – nicht-kommerzielle Nutzung ohne Partnerlizenz.
 * Bulk wird täglich via GitHub Actions aktualisiert; Live-APIs bei jeder Suche separat.
 */

import {
  filterActiveTenders,
  getBulkFetchedAt,
  loadBulkJson,
} from './bulkLoader.js';

const STALE_MS = 36 * 3600 * 1000;

const BULK_FILES = [
  { file: 'opentender-hu.json', label: 'HU' },
  { file: 'opentender-ro.json', label: 'RO' },
  { file: 'opentender-pl.json', label: 'PL' },
];

export async function fetchOpenTenderBulkTenders() {
  const batches = await Promise.all(
    BULK_FILES.map(async ({ file, label }) => {
      const payload = await loadBulkJson(file);
      const tenders = payload?.tenders?.length ? filterActiveTenders(payload.tenders) : [];
      return { label, tenders, fetchedAt: getBulkFetchedAt(payload) };
    }),
  );

  const loaded = batches.filter((b) => b.tenders.length > 0);
  const tenders = loaded.flatMap((b) => b.tenders);
  const countries = loaded.map((b) => b.label).join('+');
  const latestFetch = loaded
    .map((b) => b.fetchedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const stale = !latestFetch || Date.now() - new Date(latestFetch).getTime() > STALE_MS;

  if (!tenders.length) {
    return {
      tenders: [],
      source: 'opentender-bulk',
      live: false,
      error: 'OpenTender Bulk: keine Artefakte in public/data/bulk/ (npm run bulk:ingest)',
    };
  }

  return {
    tenders,
    source: `opentender-bulk-${countries}`,
    live: true,
    license: 'CC BY-NC-SA 4.0',
    bulkFetchedAt: latestFetch,
    bulkStale: stale,
    bulkStaleWarning: stale
      ? `OpenTender Bulk älter als 36h (zuletzt ${latestFetch}) – GitHub Action prüfen`
      : undefined,
  };
}
