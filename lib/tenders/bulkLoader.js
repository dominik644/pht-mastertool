/**
 * Lädt gefilterte Bulk-JSON aus public/data/bulk/ (Browser: /data/bulk/).
 * Bulk-Artefakte werden von scripts/bulk-ingest-*.mjs erzeugt (GitHub Action / npm run bulk:ingest).
 */

const BULK_SUBDIR = 'data/bulk';

async function loadBulkJsonNode(filename) {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const candidates = [
    join(process.cwd(), 'public', BULK_SUBDIR, filename),
  ];
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      /* nächster Kandidat */
    }
  }
  return null;
}

/**
 * @param {string} filename z. B. opentender-hu.json
 * @returns {Promise<{ tenders?: object[], generatedAt?: string, license?: string } | null>}
 */
export async function loadBulkJson(filename) {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/data/bulk/${filename}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
  return loadBulkJsonNode(filename);
}

/**
 * @param {string} filename
 * @returns {object[]}
 */
export async function loadBulkTenders(filename) {
  const payload = await loadBulkJson(filename);
  if (!payload?.tenders?.length) return [];
  return payload.tenders;
}
