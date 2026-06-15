/**
 * Ireland eTenders – Bulk-Ingest aus data.gov.ie CSV (CC BY 4.0)
 * Quelle: https://assets.gov.ie/static/documents/7ba65f1b/Public_Procurement_Opendata_Dataset.csv
 * Ausgabe: public/data/bulk/etenders-ie.json (max 500 PHT-Treffer, ~2 MB)
 * Bulk wird täglich via GitHub Actions aktualisiert; Live-APIs bei jeder Suche separat.
 *
 *   node scripts/bulk-ingest-ireland.mjs
 */

import fs from 'fs';
import path from 'path';
import { matchesPHTText } from '../lib/tenders/ocdsMapper.js';
import { inferIndustry, parseIsoDate } from '../lib/tenders/utils.js';

const CSV_URL = 'https://assets.gov.ie/static/documents/7ba65f1b/Public_Procurement_Opendata_Dataset.csv';
const OUTPUT_DIR = 'public/data/bulk';
const OUTPUT_FILE = 'etenders-ie.json';
const MAX_TENDERS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const LOOKBACK_DAYS = 30;

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseIeDate(value) {
  if (!value) return 0;
  const s = String(value).trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]);
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function formatIeDateIso(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const s = String(value).trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return parseIsoDate(s);
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.length)) rows.push(row);
  }
  return rows;
}

function extractCpvs(rec, headers) {
  const idx = (name) => headers.indexOf(name);
  const main = rec[idx('Main Cpv Code')] || '';
  const extra = rec[idx('Additional CPV Codes on CFT')] || '';
  return [...new Set(`${main},${extra}`.split(/[,;|]/).map((s) => s.trim()).filter((s) => /^\d/.test(s)))];
}

function mapRow(headers, values) {
  const rec = values;
  const get = (name) => {
    const i = headers.indexOf(name);
    return i >= 0 ? (rec[i] ?? '').trim() : '';
  };

  const title = get('Tender/Contract Name') || 'eTenders Ireland';
  const tenderId = get('Tender ID') || `ie-${Date.now()}`;
  const pub = get('Notice Published Date/Contract Created Date');
  const deadline = get('Tender Submission Deadline');
  const value = parseFloat(get('Notice Estimated Value (€)').replace(/[^\d.]/g, '')) || 50000;
  const cpvCodes = extractCpvs(rec, headers);
  const authority = get('Contracting Authority') || get('Name of Client Contracting Authority');
  const tedLink = get('TED Notice Link');

  const pubIso = formatIeDateIso(pub);
  const deadlineIso = formatIeDateIso(deadline || pub);

  return {
    id: `etenders-ie-${String(tenderId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: title.slice(0, 300),
    country: 'Irland',
    countryCode: 'IRL',
    region: 'Europa',
    budget: value,
    currency: 'EUR',
    sourcePlatform: 'eTenders Ireland',
    sourceUrl: tedLink || 'https://www.etenders.gov.ie',
    publicationDate: pubIso,
    submissionDeadline: deadlineIso,
    description: `${title}. Authority: ${authority}. CPV: ${get('Main Cpv Code Description')}`.slice(0, 800),
    industry: inferIndustry(`${title} ${get('Main Cpv Code Description')}`),
    cpvCodes,
  };
}

function writePayload(outFile, payload) {
  let json = JSON.stringify(payload, null, 2);
  while (json.length > MAX_BYTES && payload.tenders.length > 10) {
    payload.tenders = payload.tenders.slice(0, Math.floor(payload.tenders.length * 0.85));
    payload.matched = payload.tenders.length;
    payload.truncated = true;
    json = JSON.stringify(payload, null, 2);
  }
  fs.writeFileSync(outFile, json);
  console.log(`  → ${outFile} (${(json.length / 1024).toFixed(0)} KB, ${payload.tenders.length} tenders)`);
}

console.log('Ireland eTenders Bulk-Ingest –', new Date().toISOString());
console.log(`Filter: Veröffentlichung ≤${LOOKBACK_DAYS} Tage, Frist nicht abgelaufen`);
console.log(`Download: ${CSV_URL}\n`);

const res = await fetch(CSV_URL, {
  headers: { Accept: 'text/csv', 'User-Agent': 'PHT-Mastertool/1.0' },
  signal: AbortSignal.timeout(300000),
});
if (!res.ok) throw new Error(`CSV download ${res.status}`);

const lastModified = res.headers.get('last-modified');
if (lastModified) console.log(`  CSV Last-Modified: ${lastModified}`);

const text = await res.text();
const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
const headers = rows[0];
console.log(`  Zeilen: ${rows.length - 1}, Spalten: ${headers.length}`);

const pubCutoff = Date.now() - LOOKBACK_DAYS * 86400000;
const deadlineCutoff = startOfTodayMs();

function collectTenders(pubCutoff) {
  const out = [];
  for (const values of rows.slice(1)) {
    const get = (name) => {
      const i = headers.indexOf(name);
      return i >= 0 ? (values[i] ?? '').trim() : '';
    };

    const title = get('Tender/Contract Name');
    const desc = get('Main Cpv Code Description');
    const cpvCodes = extractCpvs(values, headers);
    if (!matchesPHTText(`${title} ${desc}`, cpvCodes)) continue;

    const pubStr = get('Notice Published Date/Contract Created Date');
    const pubTime = parseIeDate(pubStr);
    if (pubCutoff && pubTime && pubTime < pubCutoff) continue;

    const deadlineTime = parseIeDate(get('Tender Submission Deadline'));
    if (deadlineTime && deadlineTime < deadlineCutoff) continue;

    if (get('Cancelled Date') && get('Cancelled Date').toUpperCase() !== 'NULL') continue;

    out.push(mapRow(headers, values));
    if (out.length >= MAX_TENDERS * 2) break;
  }
  return out;
}

let filterRelaxed = false;
let tenders = collectTenders(pubCutoff);
if (!tenders.length) {
  filterRelaxed = true;
  tenders = collectTenders(0);
}

const unique = [...new Map(tenders.map((t) => [t.id, t])).values()]
  .sort((a, b) => (b.publicationDate || '').localeCompare(a.publicationDate || ''))
  .slice(0, MAX_TENDERS);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const outFile = path.join(OUTPUT_DIR, OUTPUT_FILE);
const fetchedAt = new Date().toISOString();
const payload = {
  fetchedAt,
  generatedAt: fetchedAt,
  country: 'IE',
  lookbackDays: LOOKBACK_DAYS,
  filterRelaxed: filterRelaxed || undefined,
  license: 'CC BY 4.0',
  source: CSV_URL,
  csvLastModified: lastModified || undefined,
  scanned: rows.length - 1,
  matched: unique.length,
  tenders: unique,
};
writePayload(outFile, payload);
console.log(`\nFertig: ${unique.length} PHT-Treffer @ ${fetchedAt}`);
