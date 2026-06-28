/**
 * Spain PCSP – Bulk-Ingest aus monatlichen CODICE/Atom-ZIPs (sindicación 643)
 *
 * Quelle: https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/
 *         licitacionesPerfilesContratanteCompleto3_AAAAMM.zip
 * Ausgabe: public/data/bulk/pcsp-es.json (max 500 PHT-Treffer, ~2 MB)
 *
 * Live-Atom-Feeds leiten auf HTML um; Monats-ZIPs mit Browser-User-Agent erreichbar.
 * Kein PCSP-Partner-Whitelist nötig.
 *
 *   node scripts/bulk-ingest-pcsp.mjs
 *   node scripts/bulk-ingest-pcsp.mjs --lookback 30
 *   node scripts/bulk-ingest-pcsp.mjs --input .tmp-pcsp-sample.zip
 */

import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import {
  BROWSER_HEADERS,
  fetchWithRetry,
  preserveArtifactOnFailure,
  writePayloadLimited,
} from '../lib/bulkIngestUtils.js';
import { filterActiveTenders } from '../lib/tenders/bulkLoader.js';
import { entryMatchesPHT, mapPcspEntry, parsePcspAtomEntries } from '../lib/tenders/pcspEsMapper.js';

const OUTPUT_DIR = 'public/data/bulk';
const OUTPUT_FILE = 'pcsp-es.json';
const MAX_TENDERS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_ATOM_FILES = 30;
const ZIP_BASE =
  'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3';
const SOURCE = 'https://www.hacienda.gob.es/es-ES/GobiernoAbierto/Datos%20Abiertos/Paginas/LicitacionesContratante.aspx';

export const PCSP_BROWSER_HEADERS = {
  ...BROWSER_HEADERS,
  Accept: 'application/zip, application/atom+xml, application/xml, */*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

function parseArgs(argv) {
  const opts = { yearMonth: null, lookbackDays: DEFAULT_LOOKBACK_DAYS, outputDir: OUTPUT_DIR, input: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--month' && argv[i + 1]) opts.yearMonth = argv[++i];
    else if (a === '--lookback' && argv[i + 1]) {
      opts.lookbackDays = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_LOOKBACK_DAYS);
    } else if (a === '--output' && argv[i + 1]) opts.outputDir = argv[++i];
    else if (a === '--input' && argv[i + 1]) opts.input = argv[++i];
  }
  return opts;
}

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function yearMonthNow() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prevYearMonth(ym) {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(4, 6));
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function zipUrl(yearMonth) {
  return `${ZIP_BASE}_${yearMonth}.zip`;
}

async function downloadZip(url, destPath) {
  console.log(`  Download: ${url}`);
  const { response } = await fetchWithRetry(url, {
    headers: PCSP_BROWSER_HEADERS,
    signal: AbortSignal.timeout(900000),
  });
  const buf = new Uint8Array(await response.arrayBuffer());
  if (buf.length < 1024) throw new Error(`ZIP zu klein (${buf.length} B)`);
  fs.writeFileSync(destPath, buf);
  console.log(`  → ${destPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
  return buf;
}

function selectAtomFiles(names) {
  const dated = names.filter((n) => n.endsWith('.atom') && /_\d{8}_\d{6}/.test(n)).sort().reverse();
  const selected = dated.slice(0, MAX_ATOM_FILES);
  const index = names.find((n) => n === 'licitacionesPerfilesContratanteCompleto3.atom');
  if (index && !selected.includes(index)) selected.push(index);
  if (!selected.length) {
    return names.filter((n) => n.endsWith('.atom')).sort().reverse().slice(0, MAX_ATOM_FILES);
  }
  return selected;
}

function parseUpdatedMs(updated) {
  if (!updated) return 0;
  const t = Date.parse(updated);
  return Number.isNaN(t) ? 0 : t;
}

function parseDeadlineMs(deadline) {
  if (!deadline) return 0;
  const t = Date.parse(deadline);
  return Number.isNaN(t) ? 0 : t;
}

function processZip(buf, lookbackDays) {
  const files = unzipSync(buf);
  const names = Object.keys(files);
  const atomFiles = selectAtomFiles(names);
  console.log(`  ${names.length} Dateien, verarbeite ${atomFiles.length} Atom-Feeds`);

  const deadlineCutoff = startOfTodayMs();
  const pubCutoff = Date.now() - lookbackDays * 86400000;
  const byId = new Map();
  let scanned = 0;

  const collect = ({ pubMin, skipDeadline }) => {
    for (const file of atomFiles) {
      const xml = new TextDecoder('utf8').decode(files[file]);
      for (const entry of parsePcspAtomEntries(xml)) {
        scanned++;
        const pubTime = parseUpdatedMs(entry.updated);
        if (pubMin && pubTime && pubTime < pubMin) continue;
        if (!skipDeadline) {
          const deadlineTime = parseDeadlineMs(entry.deadline);
          if (deadlineTime && deadlineTime < deadlineCutoff) continue;
        }
        if (!entryMatchesPHT(entry)) continue;
        const existing = byId.get(entry.id);
        if (!existing || pubTime > parseUpdatedMs(existing.updated)) {
          byId.set(entry.id, entry);
        }
        if (byId.size >= MAX_TENDERS * 3) break;
      }
      if (byId.size >= MAX_TENDERS * 3) break;
    }
  };

  collect({ pubMin: pubCutoff, skipDeadline: false });
  let filterRelaxed = false;
  let deadlineRelaxed = false;

  if (!byId.size) {
    filterRelaxed = true;
    byId.clear();
    scanned = 0;
    collect({ pubMin: 0, skipDeadline: false });
  }

  if (!byId.size) {
    deadlineRelaxed = true;
    filterRelaxed = true;
    byId.clear();
    scanned = 0;
    collect({ pubMin: 0, skipDeadline: true });
  }

  const tenders = [...byId.values()]
    .map(mapPcspEntry)
    .sort((a, b) => (b.publicationDate || '').localeCompare(a.publicationDate || ''))
    .slice(0, MAX_TENDERS);

  return { tenders, scanned, filterRelaxed, deadlineRelaxed };
}

function writePayload(outFile, payload) {
  writePayloadLimited(outFile, payload, MAX_BYTES);
}

const opts = parseArgs(process.argv);
const outFile = path.join(opts.outputDir, OUTPUT_FILE);

async function runIngest() {
  fs.mkdirSync(opts.outputDir, { recursive: true });
  console.log('PCSP ES Bulk-Ingest →', opts.outputDir);
  console.log(`Filter: Aktualisierung ≤${opts.lookbackDays} Tage, Frist nicht abgelaufen`);
  console.log(`Quelle: ${SOURCE}\n`);

  let bulkUrl = null;
  let usedMonth = opts.yearMonth;
  const tempZip = path.join(opts.outputDir, '.pcsp-bulk-temp.zip');
  let zipBuf;

  if (opts.input) {
    console.log(`Lokal: ${opts.input}`);
    zipBuf = new Uint8Array(fs.readFileSync(opts.input));
  } else {
    const months = opts.yearMonth ? [opts.yearMonth] : [yearMonthNow(), prevYearMonth(yearMonthNow())];
    let lastErr;
    for (const ym of months) {
      console.log(`\n=== PCSP ES ${ym} ===`);
      try {
        bulkUrl = zipUrl(ym);
        zipBuf = await downloadZip(bulkUrl, tempZip);
        usedMonth = ym;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`  ${ym} nicht verfügbar: ${err.message}`);
      }
    }
    if (!zipBuf) throw lastErr || new Error('Kein PCSP-Bulk verfügbar');
  }

  const { tenders, scanned, filterRelaxed, deadlineRelaxed: ingestDeadlineRelaxed } = processZip(
    zipBuf,
    opts.lookbackDays,
  );

  if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);

  const activeCount = filterActiveTenders(tenders).length;
  const deadlineRelaxed =
    ingestDeadlineRelaxed || (tenders.length > 0 && activeCount < Math.max(5, tenders.length * 0.15));

  const fetchedAt = new Date().toISOString();
  const payload = {
    fetchedAt,
    generatedAt: fetchedAt,
    country: 'ES',
    yearMonth: usedMonth,
    lookbackDays: opts.lookbackDays,
    filterRelaxed: filterRelaxed || undefined,
    deadlineRelaxed: deadlineRelaxed || undefined,
    archiveNote: deadlineRelaxed
      ? `PCSP CODICE ${usedMonth}: Vertragsregister – Fristen oft abgelaufen`
      : filterRelaxed
        ? 'Lookback ohne Treffer – erweiterter Filter'
        : undefined,
    source: SOURCE,
    bulkUrl: bulkUrl || undefined,
    scanned,
    matched: tenders.length,
    license: 'Datos abiertos – Ministerio de Hacienda / PLACSP',
    tenders,
  };
  writePayload(outFile, payload);
  console.log(`\nFertig: ${tenders.length} PHT-Treffer @ ${fetchedAt}`);
}

try {
  await runIngest();
} catch (err) {
  console.error('PCSP Bulk-Ingest Fehler:', err.message);
  if (preserveArtifactOnFailure(outFile, err, SOURCE)) {
    process.exit(0);
  }
  throw err;
}
