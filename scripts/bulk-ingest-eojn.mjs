/**
 * Croatia EOJN – Bulk-Ingest aus OCP Data Registry (EOJN OCDS Vertragsregister)
 *
 * Quelle: https://eojn.nn.hr/SPIN/application/ipn/Oglasnik/PreuzimanjeUgovoraOCD.aspx
 * Mirror: https://data.open-contracting.org/en/publication/80/download?name=YEAR.jsonl.gz
 * Ausgabe: public/data/bulk/eojn-hr.json (max 500 PHT-Treffer, ~2 MB)
 *
 *   node scripts/bulk-ingest-eojn.mjs
 *   node scripts/bulk-ingest-eojn.mjs --year 2026 --lookback 30
 */

import fs from 'fs';
import path from 'path';
import { gunzipSync } from 'fflate';
import {
  fetchWithRetry,
  preserveArtifactOnFailure,
  writePayloadLimited,
} from '../lib/bulkIngestUtils.js';
import { mapOcdsRelease, matchesPHTText } from '../lib/tenders/ocdsMapper.js';

const OUTPUT_DIR = 'public/data/bulk';
const OUTPUT_FILE = 'eojn-hr.json';
const MAX_TENDERS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_LOOKBACK_DAYS = 30;
const OCP_PUBLICATION_ID = 80;
const OCP_BASE = `https://data.open-contracting.org/en/publication/${OCP_PUBLICATION_ID}/download`;
const EOJN_SOURCE = 'https://eojn.nn.hr/SPIN/application/ipn/Oglasnik/PreuzimanjeUgovoraOCD.aspx';

function parseArgs(argv) {
  const opts = { year: null, lookbackDays: DEFAULT_LOOKBACK_DAYS, outputDir: OUTPUT_DIR, input: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--year' && argv[i + 1]) opts.year = argv[++i];
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

async function downloadGz(url) {
  console.log(`  Download: ${url}`);
  const { response, buffer } = await fetchWithRetry(url, {
    signal: AbortSignal.timeout(600000),
  });
  const buf = buffer ?? new Uint8Array(await response.arrayBuffer());
  console.log(`  ${(buf.length / 1024 / 1024).toFixed(1)} MB gzip`);
  return gunzipSync(buf);
}

function loadLocalGz(filePath) {
  const raw = fs.readFileSync(filePath);
  return filePath.endsWith('.gz') ? gunzipSync(raw) : raw;
}

function extractCpvCodes(release) {
  const tender = release.tender ?? {};
  return [
    tender.classification?.id,
    ...(tender.items ?? []).map((i) => i.classification?.id),
    ...(tender.lots ?? []).flatMap((l) => [
      l.classification?.id,
      ...(l.items ?? []).map((i) => i.classification?.id),
    ]),
  ].filter(Boolean).map(String);
}

function parseReleaseDate(release) {
  const tender = release.tender ?? {};
  const raw = release.date || tender.datePublished || tender.enquiryPeriod?.startDate;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function parseDeadlineMs(release) {
  const tender = release.tender ?? {};
  const raw = tender.tenderPeriod?.endDate || release.date;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function processJsonl(bytes, lookbackDays, archiveYear) {
  const text = new TextDecoder().decode(bytes);
  const lines = text.split('\n');
  const deadlineCutoff = startOfTodayMs();
  const pubCutoff = Date.now() - lookbackDays * 86400000;
  const currentYear = new Date().getFullYear();
  const archiveIsStale = archiveYear && Number(archiveYear) < currentYear;

  const tryCollect = ({ pubMin, skipDeadline }) => {
    const tenders = [];
    let scanned = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      scanned++;
      let release;
      try {
        release = JSON.parse(line);
      } catch {
        continue;
      }

      const pubTime = parseReleaseDate(release);
      if (pubMin && pubTime && pubTime < pubMin) continue;

      if (!skipDeadline) {
        const deadlineTime = parseDeadlineMs(release);
        if (deadlineTime && deadlineTime < deadlineCutoff) continue;
      }

      const title = release.tender?.title || release.description || '';
      const desc = release.tender?.description || '';
      const cpv = extractCpvCodes(release);
      if (!matchesPHTText(`${title} ${desc}`, cpv)) continue;

      tenders.push(
        mapOcdsRelease(release, {
          country: 'Kroatien',
          countryCode: 'HRV',
          region: 'Europa',
          sourcePlatform: 'EOJN HR',
          idPrefix: 'eojn-hr',
          urlBase: 'https://eojn.nn.hr/OGLASNIK/',
        }),
      );
      if (tenders.length >= MAX_TENDERS * 2) break;
    }
    return { tenders, scanned };
  };

  let { tenders, scanned } = tryCollect({ pubMin: pubCutoff, skipDeadline: false });
  let filterRelaxed = false;
  let deadlineRelaxed = false;

  if (!tenders.length) {
    filterRelaxed = true;
    ({ tenders, scanned } = tryCollect({ pubMin: 0, skipDeadline: false }));
  }

  if (!tenders.length || archiveIsStale) {
    const relaxed = tryCollect({ pubMin: 0, skipDeadline: true });
    if (relaxed.tenders.length) {
      deadlineRelaxed = true;
      if (!tenders.length) {
        filterRelaxed = true;
        ({ tenders, scanned } = relaxed);
      } else if (archiveIsStale) {
        ({ tenders, scanned } = relaxed);
      }
    }
  }

  const unique = [...new Map(tenders.map((t) => [t.id, t])).values()]
    .sort((a, b) => (b.publicationDate || '').localeCompare(a.publicationDate || ''))
    .slice(0, MAX_TENDERS);
  return { tenders: unique, scanned, filterRelaxed, deadlineRelaxed };
}

function writePayload(outFile, payload) {
  writePayloadLimited(outFile, payload, MAX_BYTES);
}

const opts = parseArgs(process.argv);
const outFile = path.join(opts.outputDir, OUTPUT_FILE);

async function runIngest() {
  console.log('EOJN HR Bulk-Ingest →', opts.outputDir);
  console.log(`Filter: Veröffentlichung ≤${opts.lookbackDays} Tage, Frist nicht abgelaufen`);
  console.log(`Quelle: ${EOJN_SOURCE}\n`);

  let bytes;
  let usedYear = opts.year;

  if (opts.input) {
    console.log(`Lokal: ${opts.input}`);
    bytes = loadLocalGz(opts.input);
  } else {
    const y = new Date().getFullYear();
    const years = opts.year ? [opts.year] : [String(y), String(y - 1), String(y - 2)];
    let lastErr;
    for (const year of years) {
      console.log(`\n=== HR EOJN ${year} (letzte ${opts.lookbackDays} Tage) ===`);
      try {
        bytes = await downloadGz(`${OCP_BASE}?name=${year}.jsonl.gz`);
        usedYear = year;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`  ${year} nicht verfügbar: ${err.message}`);
      }
    }
    if (!bytes) throw lastErr || new Error('Kein EOJN-Archiv verfügbar');
  }

  const { tenders, scanned, filterRelaxed, deadlineRelaxed } = processJsonl(
    bytes,
    opts.lookbackDays,
    usedYear,
  );

  fs.mkdirSync(opts.outputDir, { recursive: true });
  const fetchedAt = new Date().toISOString();
  const payload = {
    fetchedAt,
    generatedAt: fetchedAt,
    country: 'HR',
    year: usedYear,
    lookbackDays: opts.lookbackDays,
    filterRelaxed: filterRelaxed || undefined,
    deadlineRelaxed: deadlineRelaxed || undefined,
    archiveNote: deadlineRelaxed
      ? `EOJN OCDS ${usedYear}: Vertragsregister – Fristen oft abgelaufen`
      : filterRelaxed
        ? 'Lookback ohne Treffer – erweiterter Filter'
        : undefined,
    source: EOJN_SOURCE,
    ocpPublication: OCP_PUBLICATION_ID,
    scanned,
    matched: tenders.length,
    tenders,
  };
  writePayload(outFile, payload);
  console.log(`\nFertig: ${tenders.length} PHT-Treffer @ ${fetchedAt}`);
}

try {
  await runIngest();
} catch (err) {
  console.error('EOJN Bulk-Ingest Fehler:', err.message);
  if (preserveArtifactOnFailure(outFile, err, EOJN_SOURCE)) {
    process.exit(0);
  }
  throw err;
}
