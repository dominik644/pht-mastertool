#!/usr/bin/env node
/**
 * Geocode customer priorities → public/data/customer-geocodes.json
 * Uses offline AT PLZ centroids first, Nominatim fallback with cache merge.
 * --reconcile: purge invalid PLZ cache entries and re-geocode when zip/city changes.
 *
 * Usage: node scripts/geocode-customer-priorities.mjs [--nominatim] [--reconcile]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupPlzCentroid } from '../lib/atPlzCentroids.js';
import { checkPlzOrtMatch, inferCountryFromCity, nominatimGeocode } from '../lib/plzReconciliation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIORITIES = path.join(__dirname, '../public/data/customer-priorities.json');
const GEOCODES = path.join(__dirname, '../public/data/customer-geocodes.json');
const PLZ_CACHE = path.join(__dirname, '../public/data/at-plz-centroids.json');

const USE_NOMINATIM = process.argv.includes('--nominatim');
const RECONCILE = process.argv.includes('--reconcile');
const NOMINATIM_DELAY_MS = 1100;

function geocodeKey(zip, city, country) {
  return `${String(country).toUpperCase()}|${String(zip).trim()}|${String(city).trim().toLowerCase()}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    /* ignore */
  }
  return fallback;
}

function isValidPlzCacheEntry(plzKey, entry) {
  if (!entry?.city) return true;
  const foreign = inferCountryFromCity(entry.city);
  if (foreign && foreign !== 'AT') return false;
  const check = checkPlzOrtMatch(plzKey, entry.city, 'AT');
  return check.match !== false;
}

function purgeInvalidPlzCache(plzCache) {
  let removed = 0;
  for (const [key, entry] of Object.entries(plzCache)) {
    if (!isValidPlzCacheEntry(key, entry)) {
      delete plzCache[key];
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  const priorities = JSON.parse(fs.readFileSync(PRIORITIES, 'utf8'));
  const existing = loadJson(GEOCODES, { entries: {} });
  const plzCache = loadJson(PLZ_CACHE, {});

  if (RECONCILE) {
    const removed = purgeInvalidPlzCache(plzCache);
    if (removed) console.log(`Purged ${removed} invalid PLZ cache entries`);
  }

  const entries = RECONCILE ? {} : { ...existing.entries };
  let plzHits = 0;
  let nominatimHits = 0;
  let skipped = 0;
  let reconciled = 0;
  const nominatimQueue = [];

  for (const c of priorities.customers) {
    const key = geocodeKey(c.zip, c.city, c.country);
    const prev = existing.entries[c.id];

    if (!RECONCILE && prev?.lat != null) {
      const prevKey = prev.plz && prev.city
        ? geocodeKey(prev.plz, prev.city, c.country)
        : null;
      if (prevKey === key || !prevKey) {
        entries[c.id] = { ...prev, customerId: c.id };
        continue;
      }
    }

    if (!RECONCILE && entries[c.id]?.lat != null) continue;

    if (!RECONCILE && entries[key]?.lat != null) {
      entries[c.id] = { ...entries[key], customerId: c.id };
      continue;
    }

    const plzKey = String(c.zip).trim().padStart(4, '0').slice(0, 4);
    let point = null;
    let source = null;

    const cached = plzCache[plzKey] ?? plzCache[key];
    if (cached && isValidPlzCacheEntry(plzKey, cached)) {
      point = cached;
      source = 'plz';
      plzHits += 1;
    }

    if (!point) {
      point = lookupPlzCentroid(c.zip, c.country);
      if (point) {
        source = 'plz';
        plzHits += 1;
        if (c.country === 'AT' || /^\d{4}$/.test(c.zip)) {
          const check = checkPlzOrtMatch(c.zip, c.city, c.country);
          if (check.match !== false) {
            plzCache[plzKey] = { lat: point.lat, lng: point.lng, city: c.city };
          }
        }
      }
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
      if (entries[c.id]?.lat != null) continue;
      const query = `${c.zip} ${c.city}, ${c.country}`;
      try {
        const geo = await nominatimGeocode(query);
        await sleep(NOMINATIM_DELAY_MS);
        if (geo) {
          const entry = {
            lat: geo.lat,
            lng: geo.lng,
            source: 'nominatim',
            plz: geo.zip ?? c.zip,
            city: geo.city ?? c.city,
          };
          entries[c.id] = entry;
          entries[key] = entry;
          nominatimHits += 1;
          if (geo.zip && geo.zip !== c.zip) reconciled += 1;
          const plzKey = String(geo.zip ?? c.zip).trim().padStart(4, '0').slice(0, 4);
          if (/^\d{4}$/.test(plzKey) && geo.city) {
            const check = checkPlzOrtMatch(plzKey, geo.city, c.country);
            if (check.match !== false) {
              plzCache[plzKey] = { lat: geo.lat, lng: geo.lng, city: geo.city };
            }
          }
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
    sources: { plz: plzHits, nominatim: nominatimHits, skipped, reconciled },
    entries,
  };

  fs.writeFileSync(GEOCODES, JSON.stringify(out, null, 2));
  fs.writeFileSync(PLZ_CACHE, JSON.stringify(plzCache, null, 2));

  console.log(`Geocoded ${geocodedIds.length}/${priorities.customers.length} customers`);
  console.log(`  PLZ/offline: ${plzHits}, Nominatim: ${nominatimHits}, skipped: ${skipped}, reconciled: ${reconciled}`);
  console.log(`→ ${GEOCODES}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
