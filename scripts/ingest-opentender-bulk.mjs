/**
 * OpenTender HU/RO – Offline-Bulk-Ingest (OCP Data Registry)
 *
 * Lizenz: CC BY-NC-SA 4.0 – nur für nicht-kommerzielle Nutzung ohne Partnerlizenz.
 * Nicht auf Vercel ausführen (große Downloads + NC-Lizenz).
 *
 * Ausführen:
 *   node scripts/ingest-opentender-bulk.mjs
 *   node scripts/ingest-opentender-bulk.mjs --countries HU --year 2024
 *   node scripts/ingest-opentender-bulk.mjs --input ./downloads/2024.jsonl.gz --country HU
 *
 * Ausgabe: data/opentender-{cc}-filtered.json (PHT-relevante Ausschreibungen)
 */

import fs from 'fs';
import path from 'path';
import { gunzipSync } from 'fflate';
import { mapOcdsRelease, matchesPHTText } from '../lib/tenders/ocdsMapper.js';

const OCP_PUBLICATIONS = {
  HU: { id: 56, country: 'Ungarn', region: 'Europa', platform: 'OpenTender HU' },
  RO: { id: 75, country: 'Rumänien', region: 'Europa', platform: 'OpenTender RO' },
};

const OCP_BASE = 'https://data.open-contracting.org/en/publication';

function parseArgs(argv) {
  const opts = {
    countries: ['HU', 'RO'],
    year: String(new Date().getFullYear() - 1),
    outputDir: 'data',
    input: null,
    country: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--countries' && argv[i + 1]) opts.countries = argv[++i].split(',').map((c) => c.trim().toUpperCase());
    else if (a === '--year' && argv[i + 1]) opts.year = argv[++i];
    else if (a === '--output' && argv[i + 1]) opts.outputDir = argv[++i];
    else if (a === '--input' && argv[i + 1]) opts.input = argv[++i];
    else if (a === '--country' && argv[i + 1]) opts.country = argv[++i].toUpperCase();
  }
  return opts;
}

async function downloadGz(url) {
  console.log(`  Download: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) throw new Error(`Download ${res.status}: ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
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

function processJsonl(bytes, meta) {
  const text = new TextDecoder().decode(bytes);
  const lines = text.split('\n');
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
    const title = release.tender?.title || release.description || '';
    const desc = release.tender?.description || '';
    const cpv = extractCpvCodes(release);
    if (!matchesPHTText(`${title} ${desc}`, cpv)) continue;

    tenders.push(
      mapOcdsRelease(release, {
        country: meta.country,
        region: meta.region,
        sourcePlatform: meta.platform,
        idPrefix: `opentender-${meta.cc.toLowerCase()}`,
        urlBase: `https://opentender.eu/${meta.cc.toLowerCase()}/tender/`,
      }),
    );
  }

  return { tenders, scanned };
}

async function ingestCountry(cc, opts) {
  const pub = OCP_PUBLICATIONS[cc];
  if (!pub) throw new Error(`Unbekanntes Land: ${cc}`);

  let bytes;
  if (opts.input) {
    console.log(`\n=== ${cc} (lokal: ${opts.input}) ===`);
    bytes = loadLocalGz(opts.input);
  } else {
    const url = `${OCP_BASE}/${pub.id}/download?name=${opts.year}.jsonl.gz`;
    console.log(`\n=== ${cc} ${opts.year} ===`);
    bytes = await downloadGz(url);
  }

  const { tenders, scanned } = processJsonl(bytes, { ...pub, cc });
  const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];

  fs.mkdirSync(opts.outputDir, { recursive: true });
  const outFile = path.join(opts.outputDir, `opentender-${cc.toLowerCase()}-filtered.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    country: cc,
    year: opts.year,
    license: 'CC BY-NC-SA 4.0',
    scanned,
    matched: unique.length,
    tenders: unique,
  };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`  Zeilen: ${scanned}, PHT-Treffer: ${unique.length} → ${outFile}`);
  return payload;
}

const opts = parseArgs(process.argv);
if (opts.input && !opts.country) {
  console.error('Mit --input auch --country HU|RO angeben');
  process.exit(1);
}

console.log('OpenTender Bulk-Ingest –', new Date().toISOString());
console.log('Lizenz: CC BY-NC-SA 4.0 (nicht kommerziell ohne Vereinbarung)\n');

const targets = opts.input ? [opts.country] : opts.countries;
const summaries = [];

for (const cc of targets) {
  try {
    summaries.push(await ingestCountry(cc, opts));
  } catch (err) {
    console.error(`  FEHLER ${cc}:`, err.message);
    summaries.push({ country: cc, error: err.message });
  }
}

console.log('\nFertig:', summaries.map((s) => `${s.country}: ${s.matched ?? 'ERR'}`).join(', '));
