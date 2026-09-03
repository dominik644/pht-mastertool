/**
 * Import colleague Excel export into customer-priorities.json (merge, no overwrite).
 *
 * Usage:
 *   node scripts/import-colleague-customers.mjs <xlsx> --owner "Holger Stefani"
 *   node scripts/import-colleague-customers.mjs --all  (imports known colleague files from transfers folder)
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reconcileAddress, inferCountryFromCity } from '../lib/plzReconciliation.js';
import {
  PHT_CUSTOMER_PROFILE,
  classifySector,
  computePotentialScore,
  assignPriority,
  cadenceMonths,
  isDuplicateLead,
} from '../lib/phtCustomerProfile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../public/data/customer-priorities.json');

const DEFAULT_TRANSFERS =
  'C:/Users/Dominik Weller/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/79A8C70253D582118B60509D9D7A6D031C2B751A/transfers/2026-36';

const KNOWN_IMPORTS = [
  { file: 'PHT_Andreas_Schmidt_2010_2026.xlsx', owner: 'Andreas Schmidt' },
  { file: 'PHT_Andy_Rehbein_2010_2026.xlsx', owner: 'Andy Rehbein' },
  { file: 'PHT_Daniel_Beck_2010_2026.xlsx', owner: 'Daniel Beck' },
  { file: 'PHT_Holger_Stefani_2010_2026.xlsx', owner: 'Holger Stefani' },
  { file: 'PHT_Ronald_Gross_2010_2026.xlsx', owner: 'Ronald Gross' },
  { file: 'PHT_Stefan_Wern_2010_2026.xlsx', owner: 'Stefan Wern' },
  { file: 'PHT_Thomas_Raab_2010_2026.xlsx', owner: 'Thomas Raab' },
];

function parseArgs() {
  const argv = process.argv.slice(2);
  const all = argv.includes('--all');
  const ownerIdx = argv.indexOf('--owner');
  const owner = ownerIdx >= 0 ? argv[ownerIdx + 1] : null;
  const paths = argv.filter((a, i) => !a.startsWith('--') && i !== ownerIdx + 1);
  return { all, owner, xlsxPath: paths[0] ?? null };
}

function ownerSlug(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugId(ownerName, name, nr) {
  const base = `${ownerSlug(ownerName)}-${nr || name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 72);
  return base;
}

function inferCountry(zip, city) {
  const fromCity = inferCountryFromCity(city);
  if (fromCity) return fromCity;
  const raw = String(zip).trim();
  if (/^\d{3}\s\d{2}$/.test(raw)) return 'CZ';
  const compact = raw.replace(/\s+/g, '');
  if (/^\d{4}$/.test(compact)) return 'AT';
  if (/^\d{5}$/.test(compact)) return 'DE';
  return 'DE';
}

function parseExcelStatus(prio) {
  const p = String(prio);
  const inactive = /inaktiv/i.test(p);
  const active = /aktiv/i.test(p) && !inactive;
  const formerA = /ehem/i.test(p);
  const urgent = /SOFORT/i.test(p);
  return { inactive, active, formerA, urgent, raw: p };
}

function parseTerritoryFromTitle(rows) {
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const cells = rows[i];
    const title = cells.find((c) => /Potenzialanalyse/i.test(String(c))) ?? cells[0];
    const parts = String(title).split('|').map((s) => s.trim());
    if (parts.length >= 3 && /Potenzialanalyse/i.test(parts[0])) return parts[2];
  }
  return null;
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (row.some((c) => String(c).trim() === 'Kundenname')) return i;
  }
  return 1;
}

function buildColumnMap(headerRow) {
  const idx = (label) => headerRow.findIndex((c) => String(c).trim() === label);
  const nr = idx('Kundennr.');
  const name = idx('Kundenname');
  if (nr < 0 || name < 0) throw new Error('Spalten Kundennr./Kundenname nicht gefunden');
  return {
    nr,
    name,
    zip: idx('PLZ'),
    city: idx('Ort'),
    abc: idx('ABC'),
    score: idx('Score'),
    prio: idx('Prioritaet'),
    days: idx('Tage ohne Kauf'),
    active: idx('Aktiv 2026?'),
    wasch: idx('Austausch Wasch'),
    schaum: idx('Austausch Schaum'),
    schleuse: idx('Austausch Schleuse'),
    details: idx('Austausch Details'),
  };
}

function parseExchange(row, cols) {
  const hints = [];
  const fields = [
    { col: cols.wasch, label: 'Wasch' },
    { col: cols.schaum, label: 'Schaum' },
    { col: cols.schleuse, label: 'Schleuse' },
    { col: cols.details, label: 'Details' },
  ];
  for (const f of fields) {
    if (f.col < 0) continue;
    const v = String(row[f.col] ?? '').trim();
    if (v && v !== '-' && v !== '–') {
      hints.push(f.col === cols.details ? v : `${f.label}: ${v}`);
    }
  }
  return hints;
}

function getCell(row, col, fallback = '') {
  if (col < 0) return fallback;
  return row[col] ?? fallback;
}

function isSameCustomer(a, b) {
  if (a.customerNumber && b.customerNumber && a.customerNumber === b.customerNumber) return true;
  const na = String(a.name ?? '').toLowerCase().trim();
  const nb = String(b.name ?? '').toLowerCase().trim();
  const ca = String(a.city ?? '').toLowerCase().trim();
  const cb = String(b.city ?? '').toLowerCase().trim();
  return na === nb && ca === cb;
}

async function importOneFile(xlsxPath, ownerName) {
  if (!fs.existsSync(xlsxPath)) {
    console.error('Excel nicht gefunden:', xlsxPath);
    return null;
  }

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets.Potenzialanalyse;
  if (!ws) {
    console.error('Sheet Potenzialanalyse fehlt:', xlsxPath);
    return null;
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = findHeaderRow(rows);
  const cols = buildColumnMap(rows[headerIdx]);
  const territory = parseTerritoryFromTitle(rows);
  const dataRows = rows.slice(headerIdx + 1).filter((r) => {
    const nr = String(getCell(r, cols.nr)).trim();
    const name = String(getCell(r, cols.name)).trim();
    return nr && name;
  });

  let plzCorrected = 0;
  let plzWarnings = 0;
  const imported = [];

  for (const row of dataRows) {
    const name = String(getCell(row, cols.name)).trim();
    const excelZip = String(getCell(row, cols.zip)).trim();
    const excelCity = String(getCell(row, cols.city)).trim();
    const excelAbc = String(getCell(row, cols.abc)).trim();
    const excelScore = Number(getCell(row, cols.score)) || 0;
    const status = parseExcelStatus(getCell(row, cols.prio));
    const daysSincePurchase = cols.days >= 0 ? Number(getCell(row, cols.days)) || null : null;
    const active2026 = cols.active >= 0 ? !/nein/i.test(String(getCell(row, cols.active))) : true;
    const exchangeHints = parseExchange(row, cols);
    const country = inferCountry(excelZip, excelCity);

    const reconciled = await reconcileAddress({
      zip: excelZip,
      city: excelCity,
      country,
      name,
      source: 'excel',
      useNominatim: false,
    });
    if (reconciled.plzCorrected) plzCorrected += 1;
    if (reconciled.plzWarning) plzWarnings += 1;

    const sector = classifySector(name);
    const isMeat = !!sector.meat;
    const potentialScore = computePotentialScore({
      sector,
      excelScore,
      status,
      exchangeHints,
      country: reconciled.country,
      isMeat,
    });
    const priority = assignPriority({ sector, isMeat, potentialScore, excelAbc, status });

    imported.push({
      id: slugId(ownerName, name, getCell(row, cols.nr)),
      customerNumber: String(getCell(row, cols.nr)).trim(),
      name,
      city: reconciled.city,
      zip: reconciled.zip,
      country: reconciled.country,
      bundesland: reconciled.bundesland,
      sector: sector.id,
      sectorLabel: sector.label,
      priority,
      potentialScore,
      visitCadenceMonths: cadenceMonths(priority),
      source: 'excel',
      owner: ownerName,
      salesRep: ownerName,
      territoryLabel: territory,
      excelAbc,
      excelScore,
      excelStatus: status.raw,
      active2026,
      daysSincePurchase,
      exchangePotential: exchangeHints,
      isMeatIndustry: isMeat,
      importedAt: new Date().toISOString(),
      importedFrom: path.basename(xlsxPath),
      ...(reconciled.plzWarning ? { plzWarning: true, plzWarningDetail: reconciled.plzWarningDetail } : {}),
      ...(reconciled.plzCorrected ? { plzCorrected: true, originalZip: reconciled.originalZip } : {}),
    });
  }

  return { ownerName, territory, imported, plzCorrected, plzWarnings, xlsxPath };
}

function mergeIntoStore(existing, batch) {
  const customers = [...(existing.customers ?? [])];
  let added = 0;
  let skipped = 0;

  for (const c of batch.imported) {
    const dup = customers.find((x) => x.owner === batch.ownerName && isSameCustomer(x, c));
    if (dup) {
      skipped += 1;
      continue;
    }
    const crossOwner = customers.find((x) => x.owner !== batch.ownerName && isSameCustomer(x, c));
    if (crossOwner && crossOwner.customerNumber === c.customerNumber) {
      skipped += 1;
      continue;
    }
    if (!isDuplicateLead(c, customers)) {
      customers.push(c);
      added += 1;
    } else {
      skipped += 1;
    }
  }

  return { customers, added, skipped };
}

function countByOwner(customers) {
  const map = {};
  for (const c of customers) {
    const o = c.owner ?? c.salesRep ?? 'Unbekannt';
    map[o] = (map[o] ?? 0) + 1;
  }
  return map;
}

async function main() {
  const { all, owner, xlsxPath } = parseArgs();
  const jobs = [];

  if (all) {
    for (const k of KNOWN_IMPORTS) {
      jobs.push({ xlsxPath: path.join(DEFAULT_TRANSFERS, k.file), owner: k.owner });
    }
  } else if (xlsxPath && owner) {
    jobs.push({ xlsxPath, owner });
  } else {
    console.error('Usage: node scripts/import-colleague-customers.mjs <xlsx> --owner "Name"');
    console.error('   or: node scripts/import-colleague-customers.mjs --all');
    process.exit(1);
  }

  const existing = fs.existsSync(OUT)
    ? JSON.parse(fs.readFileSync(OUT, 'utf8'))
    : { customers: [] };

  let totalAdded = 0;
  let totalSkipped = 0;
  const summaries = [];

  for (const job of jobs) {
    console.log('\n===', job.owner, '===', job.xlsxPath);
    const batch = await importOneFile(job.xlsxPath, job.owner);
    if (!batch) continue;
    const { customers, added, skipped } = mergeIntoStore(existing, batch);
    existing.customers = customers;
    totalAdded += added;
    totalSkipped += skipped;
    summaries.push({
      owner: job.owner,
      territory: batch.territory,
      parsed: batch.imported.length,
      added,
      skipped,
      plzCorrected: batch.plzCorrected,
      plzWarnings: batch.plzWarnings,
    });
    console.log(`  Zeilen: ${batch.imported.length} | neu: ${added} | übersprungen: ${skipped} | Gebiet: ${batch.territory ?? '–'}`);
  }

  const ownerCounts = countByOwner(existing.customers);
  existing.generatedAt = new Date().toISOString();
  existing.colleagueImports = summaries;
  existing.ownerCounts = ownerCounts;
  existing.owners = Object.keys(ownerCounts).sort();

  const countPri = (p) => existing.customers.filter((c) => c.priority === p).length;
  existing.priorityCounts = { A: countPri('A'), B: countPri('B'), C: countPri('C') };
  existing.region = existing.region ?? PHT_CUSTOMER_PROFILE.region;
  existing.strategy = existing.strategy ?? PHT_CUSTOMER_PROFILE.strategy;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 2), 'utf8');

  console.log('\nGeschrieben:', OUT);
  console.log('Gesamt Kunden:', existing.customers.length);
  console.log('Neu hinzugefügt:', totalAdded, '| Übersprungen:', totalSkipped);
  console.log('Pro Owner:', ownerCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
