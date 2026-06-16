/**
 * Italy ANAC – Bulk-Ingest aus CKAN + monatliche OCDS-Release-Pakete
 *
 * Quelle: https://dati.anticorruzione.it/opendata/dataset (CKAN API + Bulk-JSON)
 * Ausgabe: public/data/bulk/anac-it.json (max 500 PHT-Treffer, ~2 MB)
 *
 * Hinweis: WAF blockiert Bot-User-Agents; Browser-Header erforderlich.
 * Live-OCDS-API (/opendata/ocds/api/releases) liefert 404 – nur Bulk nutzbar.
 *
 *   node scripts/bulk-ingest-anac.mjs
 *   node scripts/bulk-ingest-anac.mjs --year 2026 --lookback 45
 */

import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import chain from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/pick.js';
import { streamArray } from 'stream-json/streamers/stream-array.js';
import { mapOcdsRelease, matchesPHTText } from '../lib/tenders/ocdsMapper.js';
import { filterActiveTenders } from '../lib/tenders/bulkLoader.js';

const OUTPUT_DIR = 'public/data/bulk';
const OUTPUT_FILE = 'anac-it.json';
const MAX_TENDERS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_LOOKBACK_DAYS = 45;
const CKAN_BASE = 'https://dati.anticorruzione.it/opendata/api/3/action';
const SOURCE = 'https://dati.anticorruzione.it/opendata/dataset';

export const ANAC_BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

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

async function ckanShow(packageId) {
  const url = `${CKAN_BASE}/package_show?id=${encodeURIComponent(packageId)}`;
  const res = await fetch(url, {
    headers: ANAC_BROWSER_HEADERS,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`CKAN package_show ${res.status}: ${packageId}`);
  const body = await res.json();
  if (!body.success) throw new Error(`CKAN Fehler: ${body.error?.message || packageId}`);
  return body.result;
}

function listBulkResourceUrls(pkg) {
  return (pkg?.resources ?? [])
    .filter((r) => String(r.format || '').toUpperCase() === 'JSON' && r.url?.includes('/bulk/'))
    .sort((a, b) => String(b.name).localeCompare(String(a.name)))
    .map((r) => r.url);
}

async function resolveBulkUrl(year) {
  const pkg = await ckanShow(`ocds-appalti-ordinari-${year}`);
  const urls = listBulkResourceUrls(pkg);
  if (!urls.length) throw new Error(`Kein Bulk-JSON für ocds-appalti-ordinari-${year}`);
  return { urls, packageId: pkg.name || `ocds-appalti-ordinari-${year}` };
}

async function downloadToFile(url, destPath) {
  console.log(`  Download: ${url}`);
  const res = await fetch(url, {
    headers: ANAC_BROWSER_HEADERS,
    signal: AbortSignal.timeout(900000),
  });
  if (!res.ok) throw new Error(`Download ${res.status}: ${url}`);
  const cl = Number(res.headers.get('content-length') || 0);
  if (cl) console.log(`  ${(cl / 1024 / 1024).toFixed(1)} MB erwartet`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  const size = fs.statSync(destPath).size;
  console.log(`  → ${destPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  return size;
}

async function downloadFirstAvailable(urls, destPath) {
  let lastErr;
  for (const url of urls) {
    try {
      await downloadToFile(url, destPath);
      return url;
    } catch (err) {
      lastErr = err;
      console.warn(`  ${url} fehlgeschlagen: ${err.message}`);
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    }
  }
  throw lastErr || new Error('Kein Bulk-Download verfügbar');
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
  ]
    .filter(Boolean)
    .map(String);
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

function buildSourceUrl(release, year) {
  const doc = release.tender?.documents?.find((d) => d.url)?.url;
  if (doc) return doc;
  if (release.ocid) {
    return `https://dati.anticorruzione.it/opendata/dataset/ocds-appalti-ordinari-${year}`;
  }
  return SOURCE;
}

function processPackageFile(filePath, lookbackDays, archiveYear) {
  const deadlineCutoff = startOfTodayMs();
  const pubCutoff = Date.now() - lookbackDays * 86400000;
  const currentYear = new Date().getFullYear();
  const archiveIsStale = archiveYear && Number(archiveYear) < currentYear;

  const tryCollect = ({ pubMin, skipDeadline }) =>
    new Promise((resolve, reject) => {
      const tenders = [];
      let scanned = 0;
      const stream = chain([
        fs.createReadStream(filePath),
        parser(),
        pick({ filter: 'releases' }),
        streamArray(),
      ]);

      stream.on('data', ({ value: release }) => {
        scanned++;
        const pubTime = parseReleaseDate(release);
        if (pubMin && pubTime && pubTime < pubMin) return;

        if (!skipDeadline) {
          const deadlineTime = parseDeadlineMs(release);
          if (deadlineTime && deadlineTime < deadlineCutoff) return;
        }

        const title = release.tender?.title || release.description || '';
        const desc = release.tender?.description || '';
        const cpv = extractCpvCodes(release);
        if (!matchesPHTText(`${title} ${desc}`, cpv)) return;

        const mapped = mapOcdsRelease(release, {
          country: 'Italien',
          countryCode: 'ITA',
          region: 'Europa',
          sourcePlatform: 'ANAC',
          idPrefix: 'anac-it',
          currency: 'EUR',
        });
        mapped.countryCode = 'ITA';
        mapped.sourceUrl = buildSourceUrl(release, archiveYear || currentYear);
        tenders.push(mapped);
        if (tenders.length >= MAX_TENDERS * 2) stream.destroy();
      });

      stream.on('end', () => resolve({ tenders, scanned }));
      stream.on('close', () => resolve({ tenders, scanned }));
      stream.on('error', reject);
    });

  return (async () => {
    let { tenders, scanned } = await tryCollect({ pubMin: pubCutoff, skipDeadline: false });
    let filterRelaxed = false;
    let deadlineRelaxed = false;

    if (!tenders.length) {
      filterRelaxed = true;
      ({ tenders, scanned } = await tryCollect({ pubMin: 0, skipDeadline: false }));
    }

    if (!tenders.length || archiveIsStale) {
      const relaxed = await tryCollect({ pubMin: 0, skipDeadline: true });
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
  })();
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

const opts = parseArgs(process.argv);
fs.mkdirSync(opts.outputDir, { recursive: true });
console.log('ANAC IT Bulk-Ingest →', opts.outputDir);
console.log(`Filter: Veröffentlichung ≤${opts.lookbackDays} Tage, Frist nicht abgelaufen`);
console.log(`Quelle: ${SOURCE}\n`);

let usedYear = opts.year;
let bulkUrl = null;
const tempFile = path.join(opts.outputDir, '.anac-bulk-temp.json');

if (opts.input) {
  console.log(`Lokal: ${opts.input}`);
  fs.copyFileSync(opts.input, tempFile);
} else {
  const y = new Date().getFullYear();
  const years = opts.year ? [opts.year] : [String(y), String(y - 1)];
  let lastErr;
  for (const year of years) {
    console.log(`\n=== ANAC IT ${year} (letzte ${opts.lookbackDays} Tage) ===`);
    try {
      const resolved = await resolveBulkUrl(year);
      bulkUrl = await downloadFirstAvailable(resolved.urls, tempFile);
      usedYear = year;
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`  ${year} nicht verfügbar: ${err.message}`);
    }
  }
  if (!bulkUrl) throw lastErr || new Error('Kein ANAC-Bulk verfügbar');
}

const { tenders, scanned, filterRelaxed, deadlineRelaxed: ingestDeadlineRelaxed } = await processPackageFile(
  tempFile,
  opts.lookbackDays,
  usedYear,
);

if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

const activeCount = filterActiveTenders(tenders).length;
const deadlineRelaxed =
  ingestDeadlineRelaxed || (tenders.length > 0 && activeCount < Math.max(5, tenders.length * 0.15));

fs.mkdirSync(opts.outputDir, { recursive: true });
const outFile = path.join(opts.outputDir, OUTPUT_FILE);
const fetchedAt = new Date().toISOString();
const payload = {
  fetchedAt,
  generatedAt: fetchedAt,
  country: 'IT',
  year: usedYear,
  lookbackDays: opts.lookbackDays,
  filterRelaxed: filterRelaxed || undefined,
  deadlineRelaxed: deadlineRelaxed || undefined,
  archiveNote: deadlineRelaxed
    ? `ANAC OCDS ${usedYear}: Vertragsregister – Fristen oft abgelaufen`
    : filterRelaxed
      ? 'Lookback ohne Treffer – erweiterter Filter'
      : undefined,
  source: SOURCE,
  bulkUrl: bulkUrl || undefined,
  scanned,
  matched: tenders.length,
  license: 'CC BY 4.0 (ANAC Open Data)',
  tenders,
};
writePayload(outFile, payload);
console.log(`\nFertig: ${tenders.length} PHT-Treffer @ ${fetchedAt}`);
