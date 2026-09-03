#!/usr/bin/env node
/**
 * Import PHT Sales Funnel Excel (Beck layout with Monat/KW or Gross/Raab compact layout)
 * Usage: node scripts/import-sales-funnel.mjs --file path.xlsx --owner "Name"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/data/sales-funnels');

function parseArgs() {
  const args = process.argv.slice(2);
  let file = '';
  let owner = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) file = args[++i];
    else if (args[i] === '--owner' && args[i + 1]) owner = args[++i];
  }
  if (!file || !owner) {
    console.error('Usage: node scripts/import-sales-funnel.mjs --file <xlsx> --owner "Name"');
    process.exit(1);
  }
  return { file: path.resolve(file), owner };
}

function excelDateToIso(serial) {
  if (serial === '' || serial == null) return undefined;
  if (typeof serial === 'string') {
    const m = serial.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return undefined;
  }
  if (typeof serial === 'number' && serial > 30000) {
    const utc = Math.round((serial - 25569) * 86400 * 1000);
    return new Date(utc).toISOString().slice(0, 10);
  }
  return undefined;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v) {
  const s = String(v ?? '').trim();
  if (!s || s.toLowerCase() === 'nan') return '';
  return s;
}

function normHeader(cell) {
  return String(cell ?? '').replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function findHeaderRow(matrix) {
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const hasNr = row.some((c) => normHeader(c) === 'Nr.');
    const hasKunde = row.some((c) => normHeader(c) === 'Kunde');
    if (hasNr && hasKunde) return i;
  }
  return -1;
}

function colIndex(headers, ...names) {
  for (const name of names) {
    const idx = headers.findIndex((h) => h === name || h.includes(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row, idx) {
  if (idx < 0 || idx >= row.length) return '';
  return row[idx];
}

function isOfferNumber(value) {
  const s = str(value);
  if (!s) return false;
  if (/^AN\d+/i.test(s)) return true;
  if (/^\d{2}-\d+/.test(s)) return true;
  return false;
}

function parseRowArray(row, headers, ownerKey, monthLabel, calendarWeek) {
  const get = (...names) => {
    const idx = colIndex(headers, ...names);
    return idx >= 0 ? row[idx] : '';
  };

  const offerNumber = str(get('Nr.'));
  const customerRaw = str(get('Kunde'));
  const contactPerson = str(get('Ansprechpartner')) || undefined;
  const customer =
    customerRaw ||
    contactPerson ||
    (isOfferNumber(offerNumber) ? `Angebot ${offerNumber}` : '');
  if (!customer && !isOfferNumber(offerNumber)) return null;
  if (!customer) return null;

  const volume = num(get('Volumen'));
  if (!customerRaw && !contactPerson && !isOfferNumber(offerNumber) && volume <= 0) return null;

  const activities = [];
  for (let i = 1; i <= 3; i++) {
    const type = str(get(`Aktivität ${i}`));
    if (!type) continue;
    activities.push({
      type,
      date: excelDateToIso(get(`Datum ${i}`)),
      result: str(get(`Ergebnis ${i}`)) || undefined,
    });
  }

  const winProbability = num(get('W%'));
  const forecast = num(get('Forecast')) || Math.round(volume * (winProbability / 100));
  const status = str(get('Status')) || 'In Bearbeitung';
  const idSuffix = offerNumber || `row-${customer.slice(0, 24)}-${projectKey(get('Projekt'))}`;

  return {
    id: `seed-${idSuffix.replace(/[^a-zA-Z0-9-]+/g, '-')}`,
    ownerKey,
    offerNumber: offerNumber || undefined,
    offerMonth: str(get('Datum Angebot')) || undefined,
    validUntil: excelDateToIso(get('Gültig bis (+4W wenn leer)', 'Gültig bis')),
    followUpUntil: excelDateToIso(get('Nachfassen bis (+14T)', 'Nachfassen bis')),
    quarter: str(get('Q')) || 'NEU',
    status,
    customer,
    project: str(get('Projekt')),
    contactPerson: str(get('Ansprechpartner')) || undefined,
    volume,
    winProbability,
    forecast,
    expectedClose: excelDateToIso(get('Vorr. Abschluss')),
    monthLabel: monthLabel || str(get('Monat')) || undefined,
    calendarWeek: calendarWeek || get('KW') || undefined,
    activities,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function projectKey(p) {
  return str(p).slice(0, 12) || 'x';
}

function importFunnel(file, owner) {
  const wb = XLSX.readFile(file);
  const sheetName = wb.SheetNames[0];
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  const headerIdx = findHeaderRow(matrix);
  if (headerIdx < 0) {
    console.error('Keine Kopfzeile mit Nr./Kunde gefunden');
    process.exit(1);
  }

  const headers = matrix[headerIdx].map(normHeader);
  const ownerKey = owner.trim().toLowerCase();
  const deals = [];
  let monthLabel = '';
  let calendarWeek = '';

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const monatIdx = colIndex(headers, 'Monat');
    if (monatIdx >= 0 && str(row[monatIdx])) monthLabel = str(row[monatIdx]);
    const kwIdx = colIndex(headers, 'KW');
    if (kwIdx >= 0 && row[kwIdx] !== '' && row[kwIdx] != null) calendarWeek = row[kwIdx];

    const deal = parseRowArray(row, headers, ownerKey, monthLabel, calendarWeek);
    if (deal) deals.push(deal);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = owner.trim().toLowerCase().replace(/\s+/g, '-');
  const outPath = path.join(OUT_DIR, `${slug}.json`);
  const payload = {
    owner,
    ownerKey,
    sourceFile: path.basename(file),
    importedAt: new Date().toISOString(),
    dealCount: deals.length,
    deals,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`ok: ${deals.length} Deals → ${outPath}`);
  return payload;
}

const { file, owner } = parseArgs();
importFunnel(file, owner);
