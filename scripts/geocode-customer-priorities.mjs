#!/usr/bin/env node
/**
 * Geocode customer priorities → public/data/customer-geocodes.json
 * Uses offline AT PLZ centroids first, Nominatim fallback with cache merge.
 *
 * Usage: node scripts/geocode-customer-priorities.mjs [--nominatim]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupPlzCentroid } from '../lib/atPlzCentroids.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIORITIES = path.join(__dirname, '../public/data/customer-priorities.json');
const GEOCODES = path.join(__dirname, '../public/data/customer-geocodes.json');
const PLZ_CACHE = path.join(__dirname, '../public/data/at-plz-centroids.json');

const USE_NOMINATIM = process.argv.includes('--nominatim');
const NOMINATIM_DELAY_MS = 1100;

function geocodeKey(zip, city, country) {
  return `${String(country).toUpperCase()}|${String(zip).trim()}|${String(city).trim().toLowerCase()}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatimSearch(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'at,de,ch');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0 (customer-priorities-geocode)' },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (!data?.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    /* ignore */
  }
  return fallback;
}

async function main() {
  const priorities = JSON.parse(fs.readFileSync(PRIORITIES, 'utf8'));
  const existing = loadJson(GEOCODES, { entries: {} });
  const plzCache = loadJson(PLZ_CACHE, {});

  const entries = { ...existing.entries };
  let plzHits = 0;
  let nominatimHits = 0;
  let skipped = 0;
  const nominatimQueue = [];

  for (const c of priorities.customers) {
    if (entries[c.id]?.lat != null) continue;

    const key = geocodeKey(c.zip, c.city, c.country);
    if (entries[key]?.lat != null) {
      entries[c.id] = { ...entries[key], customerId: c.id };
      continue;
    }

    const plzKey = String(c.zip).trim().padStart(4, '0').slice(0, 4);
    let point = plzCache[plzKey] ?? plzCache[key];
    let source = point ? 'plz' : null;

    if (!point) {
      point = lookupPlzCentroid(c.zip, c.country);
      if (point) {
        source = 'plz';
        plzHits += 1;
        if (c.country === 'AT' || /^\d{4}$/.test(c.zip)) {
          plzCache[plzKey] = { lat: point.lat, lng: point.lng, city: c.city };
        }
      }
    } else {
      plzHits += 1;
    }

    if (point) {
      const entry = { lat: point.lat, lng: point.lng, source, plz: c.zip, city: c.city };
      entries[c.id] = entry;
      entries[key] = entry;
    } else {
      nominatimQueue.push(c);
    }
  }

  if (USE_NOMINATIM && nominatimQueue.length > 0) {
    console.log(`Nominatim fallback for ${nominatimQueue.length} customers…`);
    for (const c of nominatimQueue) {
      const key = geocodeKey(c.zip, c.city, c.country);
      if (entries[c.id]) continue;
      const query = `${c.zip} ${c.city}, ${c.country}`;
      try {
        const pt = await nominatimSearch(query);
        await sleep(NOMINATIM_DELAY_MS);
        if (pt) {
          const entry = { lat: pt.lat, lng: pt.lng, source: 'nominatim', plz: c.zip, city: c.city };
          entries[c.id] = entry;
          entries[key] = entry;
          nominatimHits += 1;
          const plzKey = String(c.zip).trim().padStart(4, '0').slice(0, 4);
          plzCache[plzKey] = { lat: pt.lat, lng: pt.lng, city: c.city };
        } else {
          skipped += 1;
        }
      } catch (err) {
        console.warn(`Nominatim failed for ${c.name}:`, err.message);
        skipped += 1;
      }
    }
  } else {
    skipped = nominatimQueue.length;
  }

  const uniqueIds = new Set(priorities.customers.map((c) => c.id));
  const geocodedIds = [...uniqueIds].filter((id) => entries[id]?.lat != null);

  const out = {
    generatedAt: new Date().toISOString(),
    count: geocodedIds.length,
    totalCustomers: priorities.customers.length,
    sources: { plz: plzHits, nominatim: nominatimHits, skipped },
    entries,
  };

  fs.writeFileSync(GEOCODES, JSON.stringify(out, null, 2));
  fs.writeFileSync(PLZ_CACHE, JSON.stringify(plzCache, null, 2));

  console.log(`Geocoded ${geocodedIds.length}/${priorities.customers.length} customers`);
  console.log(`  PLZ/offline: ${plzHits}, Nominatim: ${nominatimHits}, skipped: ${skipped}`);
  console.log(`→ ${GEOCODES}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
