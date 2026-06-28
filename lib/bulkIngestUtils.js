/**
 * Gemeinsame Hilfen für Bulk-Ingest-Skripte (GitHub Actions + lokal).
 * Browser-Header, Retries und Fallback auf bestehende Artefakte bei WAF/Netzwerkfehlern.
 */

import fs from 'fs';
import path from 'path';

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

const RETRYABLE = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']);

function isRetryable(err, status) {
  if (status === 403 || status === 429 || status === 502 || status === 503 || status === 504) return true;
  const code = err?.cause?.code || err?.code;
  return RETRYABLE.has(code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {{ retries?: number, minBytes?: number }} [opts]
 */
export async function fetchWithRetry(url, options = {}, opts = {}) {
  const { retries = 3, minBytes = 0 } = opts;
  const headers = { ...BROWSER_HEADERS, ...(options.headers || {}) };
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        if (attempt < retries && isRetryable(null, res.status)) {
          console.warn(`  HTTP ${res.status}, Retry ${attempt + 1}/${retries}…`);
          await sleep(1500 * (attempt + 1));
          continue;
        }
        throw new Error(`Download ${res.status}: ${url}`);
      }
      if (minBytes > 0) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.length < minBytes) {
          throw new Error(`Download zu klein (${buf.length} B): ${url}`);
        }
        return { response: res, buffer: buf };
      }
      return { response: res, buffer: null };
    } catch (err) {
      lastErr = err;
      if (attempt < retries && isRetryable(err)) {
        console.warn(`  ${err.cause?.code || err.message}, Retry ${attempt + 1}/${retries}…`);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/** @param {string} outFile */
export function loadExistingPayload(outFile) {
  try {
    if (!fs.existsSync(outFile)) return null;
    return JSON.parse(fs.readFileSync(outFile, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Bei Fehler bestehendes Artefakt behalten (Workflow bleibt grün, Daten nicht veralten ohne Not).
 * @returns {boolean} true wenn Fallback geschrieben
 */
export function preserveArtifactOnFailure(outFile, error, source) {
  const existing = loadExistingPayload(outFile);
  if (!existing?.tenders?.length) return false;

  const fetchedAt = new Date().toISOString();
  const payload = {
    ...existing,
    fetchedAt,
    generatedAt: existing.generatedAt || existing.fetchedAt || fetchedAt,
    refreshFailed: true,
    refreshError: String(error?.message || error).slice(0, 240),
    refreshAttemptedAt: fetchedAt,
    source: source || existing.source,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
  console.warn(
    `  ⚠ Fallback: ${path.basename(outFile)} unverändert (${existing.tenders.length} Treffer, letztes Update ${
      existing.fetchedAt || existing.generatedAt || '—'
    }) – ${payload.refreshError}`,
  );
  return true;
}

/** @param {string} outFile @param {object} payload @param {number} maxBytes */
export function writePayloadLimited(outFile, payload, maxBytes) {
  let json = JSON.stringify(payload, null, 2);
  while (json.length > maxBytes && payload.tenders.length > 10) {
    payload.tenders = payload.tenders.slice(0, Math.floor(payload.tenders.length * 0.85));
    payload.matched = payload.tenders.length;
    payload.truncated = true;
    json = JSON.stringify(payload, null, 2);
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${json}\n`);
  console.log(`  → ${outFile} (${(json.length / 1024).toFixed(0)} KB, ${payload.tenders.length} tenders)`);
}

/**
 * Ireland CSV-URL dynamisch über data.gov.ie CKAN (Hash auf assets.gov.ie wechselt).
 */
export async function resolveIrelandCsvUrl() {
  const fallback = 'https://assets.gov.ie/static/documents/7ba65f1b/Public_Procurement_Opendata_Dataset.csv';
  try {
    const ckanUrl =
      'https://data.gov.ie/api/3/action/package_show?id=contract-notices-published-on-etenders';
    const { response } = await fetchWithRetry(ckanUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(60000),
    });
    const body = await response.json();
    const csv = (body.result?.resources ?? []).find((r) => {
      const fmt = String(r.format || '').toLowerCase().replace(/^\./, '');
      return fmt === 'csv' && r.url;
    });
    if (csv?.url) {
      console.log(`  CKAN CSV: ${csv.url}`);
      return csv.url;
    }
  } catch (err) {
    console.warn(`  CKAN-Lookup fehlgeschlagen: ${err.message}`);
  }
  return fallback;
}
