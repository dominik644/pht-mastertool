/**
 * Canada CanadaBuys – Open Data CSV (kein REST-Search, aber 2h-Refresh)
 * GET https://canadabuys.canada.ca/opendata/pub/newTenderNotice-nouvelAvisAppelOffres.csv
 * Kleine Tagesdatei (~400 Zeilen); openTenderNotice (~6MB) bewusst nicht geladen.
 * Docs: https://open.canada.ca/data/dataset/6abd20d4-7a1c-4b38-baa2-9525d0bb2fd2
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const CSV_DIRECT = 'https://canadabuys.canada.ca/opendata/pub/newTenderNotice-nouvelAvisAppelOffres.csv';
const CSV_PROXY = '/api/tenders/canadabuys';
const PORTAL = 'https://canadabuys.canada.ca/en/tender-opportunities';

function csvUrl() {
  return typeof window !== 'undefined' ? CSV_PROXY : CSV_DIRECT;
}

/** RFC4180-ähnlicher Zeilenparser für CanadaBuys-CSV */
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

function mapRow(headers, values) {
  const rec = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  const title = rec['title-titre-eng'] || rec['title-titre-fra'] || 'CanadaBuys Notice';
  const ref = rec.referenceNumber_numeroReference
    || rec['referenceNumber-numeroReference']
    || rec.solicitationNumber_numeroSollicitation
    || rec['solicitationNumber-numeroSollicitation']
    || `can-${Date.now()}`;
  const pub = rec.publicationDate_datePublication || rec['publicationDate-datePublication'];
  const close = rec.tenderClosingDate_dateFermeture || rec['tenderClosingDate-dateFermetureOffres']
    || rec['tenderClosingDate-dateFermeture'];

  return {
    id: `canadabuys-${String(ref).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Kanada',
    countryCode: 'CAN',
    region: 'North America',
    budget: 90000,
    currency: 'CAD',
    sourcePlatform: 'CanadaBuys',
    sourceUrl: PORTAL,
    publicationDate: parseIsoDate(pub),
    submissionDeadline: parseIsoDate(close || pub),
    description: `${title}. Ref: ${ref}. Status: ${rec['tenderStatus-statutAppelOffres'] || rec.tenderStatus_statutAppelOffres || 'Open'}.`.slice(0, 800),
    industry: inferIndustry(title),
    cpvCodes: [],
  };
}

export async function fetchCanadaBuysTenders() {
  try {
    const res = await fetch(csvUrl(), {
      headers: { Accept: 'text/csv', 'User-Agent': 'PHT-Mastertool/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`CanadaBuys ${res.status}`);

    const text = await res.text();
    const rows = parseCsvRows(text);
    if (rows.length < 2) return { tenders: [], source: 'canadabuys', live: false };

    const headers = rows[0];
    const tenders = rows.slice(1).map((values) => mapRow(headers, values));
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'canadabuys', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CanadaBuys Fehler';
    console.warn('[CanadaBuys]', message);
    return { tenders: [], source: 'canadabuys-error', error: message, live: false };
  }
}
