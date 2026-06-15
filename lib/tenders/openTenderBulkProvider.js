/**
 * OpenTender HU/RO/(PL) – Bulk-OCDS aus public/data/bulk/
 *
 * Lizenz: CC BY-NC-SA 4.0 (OpenTender/OCP) – nicht-kommerzielle Nutzung ohne Partnerlizenz.
 * Daten werden offline via scripts/bulk-ingest-opentender.mjs aktualisiert (kein Live-API-Zugang).
 * Kommerzielle Vercel-Produktion: nur gefilterte Kleinst-Artefakte (<2 MB) oder TED-Fallback.
 */

import { loadBulkTenders } from './bulkLoader.js';

const BULK_FILES = [
  { file: 'opentender-hu.json', label: 'HU' },
  { file: 'opentender-ro.json', label: 'RO' },
  { file: 'opentender-pl.json', label: 'PL' },
];

export async function fetchOpenTenderBulkTenders() {
  const batches = await Promise.all(
    BULK_FILES.map(async ({ file, label }) => {
      const tenders = await loadBulkTenders(file);
      return { label, tenders };
    }),
  );

  const loaded = batches.filter((b) => b.tenders.length > 0);
  const tenders = loaded.flatMap((b) => b.tenders);
  const countries = loaded.map((b) => b.label).join('+');

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
  };
}
