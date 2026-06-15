/**
 * OpenTender HU/RO/(PL) – Production Bulk-Ingest
 *
 * Lizenz: CC BY-NC-SA 4.0 – nur nicht-kommerzielle Nutzung ohne Partnerlizenz.
 * Ausgabe: public/data/bulk/opentender-{cc}.json (max 500 Treffer, ~2 MB)
 *
 *   node scripts/bulk-ingest-opentender.mjs
 *   node scripts/bulk-ingest-opentender.mjs --countries HU,RO --year 2024
 */

import fs from 'fs';
import path from 'path';
import { gunzipSync } from 'fflate';
import { mapOcdsRelease, matchesPHTText } from '../lib/tenders/ocdsMapper.js';

const OUTPUT_DIR = 'public/data/bulk';
const MAX_TENDERS = 500;
const MAX_BYTES = 2 * 1024 * 1024;

/** OCP Data Registry publication IDs (OpenTender) */
const OCP_PUBLICATIONS = {
  HU: { id: 56, country: 'Ungarn', region: 'Europa', platform: 'OpenTender HU' },
  RO: { id: 75, country: 'Rumänien', region: 'Europa', platform: 'OpenTender RO' },
  // PL: kein zuverlässiger OCP-Bulk (e-Zamówienia live); optionaler Versuch
  PL: { id: 72, country: 'Polen', region: 'Europa', platform: 'OpenTender PL', optional: true },
};

const OCP_BASE = 'https://data.open-contracting.org/en/publication';

function parseArgs(argv) {
  const opts = {
    countries: ['HU', 'RO'],
    year: String(new Date().getFullYear() - 1),
    outputDir: OUTPUT_DIR,
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
    else if (a === '--include-pl') opts.countries = [...new Set([...opts.countries, 'PL'])];
  }
  return opts;
}

async function downloadGz(url) {
  console.log(`  Download: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(600000),
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
  const tenders = [];
  let scanned = 0;

  for (const line of text.split('\n')) {
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
    if (tenders.length >= MAX_TENDERS * 2) break;
  }

  const unique = [...new Map(tenders.map((t) => [t.id, t])).values()].slice(0, MAX_TENDERS);
  return { tenders: unique, scanned };
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
  fs.mkdirSync(opts.outputDir, { recursive: true });
  const outFile = path.join(opts.outputDir, `opentender-${cc.toLowerCase()}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    country: cc,
    year: opts.year,
    license: 'CC BY-NC-SA 4.0',
    scanned,
    matched: tenders.length,
    tenders,
  };
  writePayload(outFile, payload);
  return payload;
}

const opts = parseArgs(process.argv);
if (opts.input && !opts.country) {
  console.error('Mit --input auch --country HU|RO|PL angeben');
  process.exit(1);
}

console.log('OpenTender Bulk-Ingest →', opts.outputDir);
console.log('Lizenz: CC BY-NC-SA 4.0 (nicht kommerziell ohne Vereinbarung)\n');

const targets = opts.input ? [opts.country] : opts.countries;
const summaries = [];

for (const cc of targets) {
  const pub = OCP_PUBLICATIONS[cc];
  try {
    summaries.push(await ingestCountry(cc, opts));
  } catch (err) {
    if (pub?.optional) {
      console.warn(`  ${cc} optional, übersprungen:`, err.message);
    } else {
      console.error(`  FEHLER ${cc}:`, err.message);
    }
    summaries.push({ country: cc, error: err.message });
  }
}

console.log('\nFertig:', summaries.map((s) => `${s.country}: ${s.matched ?? 'ERR'}`).join(', '));
