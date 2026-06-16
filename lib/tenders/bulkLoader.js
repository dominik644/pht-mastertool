/**
 * Lädt gefilterte Bulk-JSON aus public/data/bulk/ (Browser: /data/bulk/).
 * Bulk-Artefakte werden täglich via GitHub Actions (npm run bulk:ingest) aktualisiert;
 * Live-API-Provider werden bei jeder Suche frisch abgefragt.
 */

import { fetchTimeoutSignal } from '../abortTimeout.js';

const BULK_SUBDIR = 'data/bulk';
const STALE_MS = 36 * 3600 * 1000;

export const BULK_ARTIFACT_FILES = [
  'opentender-hu.json',
  'opentender-ro.json',
  'opentender-pl.json',
  'etenders-ie.json',
  'eojn-hr.json',
];

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
 * @returns {Promise<{ tenders?: object[], fetchedAt?: string, generatedAt?: string, license?: string } | null>}
 */
export async function loadBulkJson(filename) {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/data/bulk/${filename}`, { signal: fetchTimeoutSignal(8000) });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
  return loadBulkJsonNode(filename);
}

/** @param {object} payload */
export function getBulkFetchedAt(payload) {
  return payload?.fetchedAt || payload?.generatedAt || null;
}

/** @param {string | undefined} deadline ISO date */
export function isActiveDeadline(deadline) {
  if (!deadline) return true;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

/** @param {object[]} tenders */
export function filterActiveTenders(tenders) {
  return tenders.filter((t) => isActiveDeadline(t.submissionDeadline || t.deadline));
}

/**
 * @param {string} filename
 * @returns {object[]}
 */
export async function loadBulkTenders(filename) {
  const payload = await loadBulkJson(filename);
  if (!payload?.tenders?.length) return [];
  return filterActiveTenders(payload.tenders);
}

/**
 * @param {string[]} [filenames]
 * @returns {Promise<{ lastBulkUpdate: string | null, stale: boolean, files: { file: string, fetchedAt: string | null, count: number }[] }>}
 */
export async function getBulkFreshness(filenames = BULK_ARTIFACT_FILES) {
  const files = await Promise.all(
    filenames.map(async (file) => {
      const payload = await loadBulkJson(file);
      return {
        file,
        fetchedAt: getBulkFetchedAt(payload),
        count: payload?.tenders?.length ?? 0,
      };
    }),
  );

  const dated = files.filter((f) => f.fetchedAt);
  const lastBulkUpdate = dated.length
    ? dated.reduce((a, b) => (a.fetchedAt > b.fetchedAt ? a : b)).fetchedAt
    : null;
  const stale = !lastBulkUpdate || Date.now() - new Date(lastBulkUpdate).getTime() > STALE_MS;

  return { lastBulkUpdate, stale, files };
}

/** @param {string | null} iso */
export function formatBulkFreshnessDe(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
