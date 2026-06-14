/**
 * New Zealand GETS – MBIE Open Data CSV (kein Live-REST)
 * Tail-Fetch (Range) – Vollfile ~20 MB zu groß für Serverless.
 * Open-Tender-Heuristik: Zeilen ohne Awarded Date + Close Date in Zukunft.
 * Region-Anreicherung via GETS-region-by-tender.csv.
 * https://www.mbie.govt.nz/.../open-data
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const CSV_DIRECT =
  'https://www.mbie.govt.nz/assets/Data-Files/NZGPP-GETS-Open-Data/GETS-award-notices.csv';
const REGION_CSV_DIRECT =
  'https://www.mbie.govt.nz/assets/Data-Files/NZGPP-GETS-Open-Data/GETS-region-by-tender.csv';
const CSV_PROXY = '/api/tenders/getsnz';
const CSV_HEADERS = [
  'Posting Agency', 'RFx ID', 'RFx Type', 'Competition Type', 'Title', 'Reference Number',
  'Open Date', 'Close Date', 'Awarded Date ', 'Department', 'Tender Coverage',
  'Prequalification Required?', 'Alternative Physical Tender Box Delivery Address',
  'Overview', 'Award Type', 'Comments', 'Awarded Amount', 'Report Date',
];
const TAIL_BYTES = 600_000;
const REGION_TAIL_BYTES = 120_000;
const LOOKBACK_DAYS = 365;
const MAX_ROWS = 150;

/** Einfacher Zeilenparser – Tail-Abschnitt hat selten mehrzeilige Felder */
function parseSimpleCsvLine(line) {
  const values = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      values.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  values.push(field);
  return values;
}

function csvUrl() {
  return typeof window !== 'undefined' ? CSV_PROXY : CSV_DIRECT;
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

function parseNzDate(raw) {
  if (!raw || raw === 'NULL') return null;
  const parts = String(raw).split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return parseIsoDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  return parseIsoDate(raw);
}

function isUnawarded(awardedRaw) {
  const v = String(awardedRaw || '').trim();
  return !v || v === 'NULL';
}

function isFutureClose(closeRaw) {
  const close = parseNzDate(closeRaw);
  if (!close) return false;
  return new Date(close).getTime() >= Date.now() - 86400000;
}

async function loadRegionMap() {
  try {
    const res = await fetch(REGION_CSV_DIRECT, {
      headers: {
        Accept: 'text/csv',
        Range: `bytes=-${REGION_TAIL_BYTES}`,
        'User-Agent': 'PHT-Mastertool/1.0',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok && res.status !== 206) return new Map();
    const lines = (await res.text()).split(/\r?\n/).filter((l) => /^\d+/.test(l.trim()));
    const map = new Map();
    for (const line of lines) {
      const [rfxId, region] = line.split(',');
      if (rfxId && region) map.set(rfxId.trim(), region.trim());
    }
    return map;
  } catch {
    return new Map();
  }
}

function mapRow(headers, values, regionMap, { open }) {
  const rec = Object.fromEntries(headers.map((h, i) => [h.trim(), values[i] ?? '']));
  const title = rec.Title || `GETS ${rec['RFx ID']}`;
  const rfxId = rec['RFx ID'] || rec['Reference Number'] || `nz-${Date.now()}`;
  const amount = Number(String(rec['Awarded Amount'] || '0').replace(/,/g, '')) || 80000;
  const closeDate = parseNzDate(rec['Close Date']);
  const openDate = parseNzDate(rec['Open Date']);
  const regionLabel = regionMap.get(String(rfxId).trim()) || '';
  const statusLabel = open ? 'Offen' : 'Vergeben';

  return {
    id: `gets-nz-${String(rfxId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Neuseeland',
    countryCode: 'NZL',
    region: 'Oceania',
    budget: amount > 0 ? Math.round(amount) : 80000,
    currency: 'NZD',
    sourcePlatform: open ? 'GETS NZ (offen)' : 'GETS NZ',
    sourceUrl: `https://www.gets.govt.nz/ExternalIndex.htm`,
    publicationDate: openDate || closeDate,
    submissionDeadline: closeDate || openDate,
    description: `${title}. Agency: ${rec['Posting Agency'] || ''}. ${statusLabel}. ${regionLabel ? `Region: ${regionLabel}. ` : ''}Type: ${rec['RFx Type'] || ''}.`.slice(0, 800),
    industry: inferIndustry(`${title} ${rec.Overview || ''}`),
    cpvCodes: [],
  };
}

export async function fetchGetsNzTenders() {
  try {
    const [res, regionMap] = await Promise.all([
      fetch(csvUrl(), {
        headers: {
          Accept: 'text/csv',
          Range: `bytes=-${TAIL_BYTES}`,
          'User-Agent': 'PHT-Mastertool/1.0',
        },
        signal: AbortSignal.timeout(45000),
      }),
      loadRegionMap(),
    ]);
    if (!res.ok && res.status !== 206) throw new Error(`GETS NZ ${res.status}`);

    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 20);
    const rows = lines
      .map(parseSimpleCsvLine)
      .filter((r) => r.length >= 10 && /^\d+$/.test(String(r[1] || '').trim()));
    if (!rows.length) return { tenders: [], source: 'gets-nz', live: false };

    const cutoff = Date.now() - LOOKBACK_DAYS * 86400000;
    const openRows = [];
    const awardRows = [];
    for (const values of rows) {
      const rec = Object.fromEntries(CSV_HEADERS.map((h, i) => [h.trim(), values[i] ?? '']));
      const unawarded = isUnawarded(rec['Awarded Date ']);
      const futureClose = isFutureClose(rec['Close Date']);
      if (unawarded && futureClose) openRows.push(values);
      else awardRows.push(values);
    }

    const sourceRows = openRows.length ? openRows : awardRows;
    const tenders = sourceRows
      .slice(-MAX_ROWS)
      .map((values) => mapRow(CSV_HEADERS, values, regionMap, { open: openRows.length > 0 }))
      .filter((t) => {
        const ts = t.publicationDate ? new Date(t.publicationDate).getTime() : 0;
        return !ts || ts >= cutoff;
      });

    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: openRows.length ? 'gets-nz-open' : 'gets-nz', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GETS NZ Fehler';
    console.warn('[GETS NZ]', message);
    return { tenders: [], source: 'gets-nz-error', error: message, live: false };
  }
}
