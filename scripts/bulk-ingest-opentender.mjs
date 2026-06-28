/**
 * OpenTender HU/RO/(PL) – Production Bulk-Ingest (tagesaktuell)
 *
 * Lizenz: CC BY-NC-SA 4.0 – nur nicht-kommerzielle Nutzung ohne Partnerlizenz.
 * Ausgabe: public/data/bulk/opentender-{cc}.json (max 500 Treffer, ~2 MB)
 * Bulk wird täglich via GitHub Actions aktualisiert; Live-APIs bei jeder Suche separat.
 *
 *   node scripts/bulk-ingest-opentender.mjs
 *   node scripts/bulk-ingest-opentender.mjs --countries HU,RO --lookback 30
 */

import fs from 'fs';
import path from 'path';
import { gunzipSync } from 'fflate';
import {
  fetchWithRetry,
  loadExistingPayload,
  preserveArtifactOnFailure,
  writePayloadLimited,
} from '../lib/bulkIngestUtils.js';
import { mapOcdsRelease, matchesPHTText } from '../lib/tenders/ocdsMapper.js';

const OUTPUT_DIR = 'public/data/bulk';
const MAX_TENDERS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_LOOKBACK_DAYS = 30;

/** OCP Data Registry publication IDs (OpenTender) */
const OCP_PUBLICATIONS = {
  HU: { id: 56, country: 'Ungarn', region: 'Europa', platform: 'OpenTender HU' },
  RO: { id: 75, country: 'Rumänien', region: 'Europa', platform: 'OpenTender RO' },
  PL: { id: 72, country: 'Polen', region: 'Europa', platform: 'OpenTender PL', optional: true },
};

const OCP_BASE = 'https://data.open-contracting.org/en/publication';

function parseArgs(argv) {
  const opts = {
    countries: ['HU', 'RO'],
    year: null,
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    outputDir: OUTPUT_DIR,
    input: null,
    country: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--countries' && argv[i + 1]) opts.countries = argv[++i].split(',').map((c) => c.trim().toUpperCase());
    else if (a === '--year' && argv[i + 1]) opts.year = argv[++i];
    else if (a === '--lookback' && argv[i + 1]) opts.lookbackDays = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_LOOKBACK_DAYS);
    else if (a === '--output' && argv[i + 1]) opts.outputDir = argv[++i];
    else if (a === '--input' && argv[i + 1]) opts.input = argv[++i];
    else if (a === '--country' && argv[i + 1]) opts.country = argv[++i].toUpperCase();
    else if (a === '--include-pl') opts.countries = [...new Set([...opts.countries, 'PL'])];
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

function processJsonl(bytes, meta, lookbackDays, archiveYear) {
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
          country: meta.country,
          region: meta.region,
          sourcePlatform: meta.platform,
          idPrefix: `opentender-${meta.cc.toLowerCase()}`,
          urlBase: `https://opentender.eu/${meta.cc.toLowerCase()}/tender/`,
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

  // Jahresarchive (z. B. 2024) haben oft keine offenen Fristen mehr – PHT-Treffer trotzdem laden.
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

async function downloadForYear(pub, year) {
  const url = `${OCP_BASE}/${pub.id}/download?name=${year}.jsonl.gz`;
  return downloadGz(url);
}

async function ingestCountry(cc, opts) {
  const pub = OCP_PUBLICATIONS[cc];
  if (!pub) throw new Error(`Unbekanntes Land: ${cc}`);

  let bytes;
  let usedYear = opts.year;

  if (opts.input) {
    console.log(`\n=== ${cc} (lokal: ${opts.input}) ===`);
    bytes = loadLocalGz(opts.input);
  } else {
    const y = new Date().getFullYear();
    const years = opts.year
      ? [opts.year]
      : [String(y), String(y - 1), String(y - 2), String(y - 3)];
    let lastErr;
    bytes = null;
    for (const year of years) {
      console.log(`\n=== ${cc} ${year} (letzte ${opts.lookbackDays} Tage) ===`);
      try {
        bytes = await downloadForYear(pub, year);
        usedYear = year;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`  ${year} nicht verfügbar: ${err.message}`);
      }
    }
    if (!bytes) throw lastErr || new Error(`Kein Archiv für ${cc}`);
  }

  const { tenders, scanned, filterRelaxed, deadlineRelaxed } = processJsonl(
    bytes,
    { ...pub, cc },
    opts.lookbackDays,
    usedYear,
  );
  fs.mkdirSync(opts.outputDir, { recursive: true });
  const outFile = path.join(opts.outputDir, `opentender-${cc.toLowerCase()}.json`);
  const fetchedAt = new Date().toISOString();
  const payload = {
    fetchedAt,
    generatedAt: fetchedAt,
    country: cc,
    year: usedYear,
    lookbackDays: opts.lookbackDays,
    filterRelaxed: filterRelaxed || undefined,
    deadlineRelaxed: deadlineRelaxed || undefined,
    archiveNote: deadlineRelaxed
      ? `Jahresarchiv ${usedYear}: Fristen abgelaufen – neueste PHT-relevante Bekanntmachungen (Frist ggf. veraltet)`
      : filterRelaxed
        ? 'Jahresarchiv ohne Veröffentlichungen im Lookback – nur aktive Fristen'
        : undefined,
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
console.log(`Filter: Veröffentlichung ≤${opts.lookbackDays} Tage, Frist nicht abgelaufen`);
console.log('Lizenz: CC BY-NC-SA 4.0 (nicht kommerziell ohne Vereinbarung)\n');

const targets = opts.input ? [opts.country] : opts.countries;
const summaries = [];

for (const cc of targets) {
  const pub = OCP_PUBLICATIONS[cc];
  const outFile = path.join(opts.outputDir, `opentender-${cc.toLowerCase()}.json`);
  try {
    summaries.push(await ingestCountry(cc, opts));
  } catch (err) {
    if (preserveArtifactOnFailure(outFile, err)) {
      const existing = loadExistingPayload(outFile);
      summaries.push({
        country: cc,
        matched: existing?.matched ?? existing?.tenders?.length ?? 0,
        refreshFailed: true,
      });
      continue;
    }
    if (pub?.optional) {
      console.warn(`  ${cc} optional, übersprungen:`, err.message);
    } else {
      console.error(`  FEHLER ${cc}:`, err.message);
    }
    summaries.push({ country: cc, error: err.message });
  }
}

console.log('\nFertig:', summaries.map((s) => `${s.country}: ${s.matched ?? 'ERR'} @ ${s.fetchedAt ?? '—'}`).join(', '));
