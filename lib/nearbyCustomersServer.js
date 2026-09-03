import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_PATH = join(__dirname, '..', 'public', 'data', 'customer-geocodes.json');
const PRIO_PATH = join(__dirname, '..', 'public', 'data', 'customer-priorities.json');

/** @type {Record<string, { lat: number, lng: number }> | null} */
let geoCache = null;
/** @type {import('../public/data/customer-priorities.json') | null} */
let prioCache = null;

function loadGeocodes() {
  if (!geoCache) {
    const data = JSON.parse(readFileSync(GEO_PATH, 'utf8'));
    geoCache = data.entries ?? {};
  }
  return geoCache;
}

function loadCustomers() {
  if (!prioCache) {
    prioCache = JSON.parse(readFileSync(PRIO_PATH, 'utf8'));
  }
  return prioCache.customers ?? [];
}

function geocodeKey(zip, city, country) {
  return `${String(country).toUpperCase()}|${String(zip).trim()}|${String(city).trim().toLowerCase()}`;
}

function getPoint(geocodes, customer) {
  const byId = geocodes[customer.id];
  if (byId) return { lat: byId.lat, lng: byId.lng };
  const byKey = geocodes[geocodeKey(customer.zip, customer.city, customer.country)];
  if (byKey) return { lat: byKey.lat, lng: byKey.lng };
  return null;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const PRIO_RANK = { A: 0, B: 1, C: 2 };

/**
 * @param {object} anchor Customer record
 * @param {string[]} slotDates ISO dates of proposed slots
 * @param {{ radiusKm?: number, limit?: number }} [opts]
 */
export function buildRegionalDaysForSlots(anchor, slotDates, opts = {}) {
  const radius = opts.radiusKm ?? 30;
  const limit = opts.limit ?? 4;
  const geocodes = loadGeocodes();
  const customers = loadCustomers();
  const anchorPoint = getPoint(geocodes, anchor);
  if (!anchorPoint) return [];

  const nearby = [];
  for (const c of customers) {
    if (c.id === anchor.id) continue;
    const point = getPoint(geocodes, c);
    if (!point) continue;
    const km = haversineKm(anchorPoint, point);
    if (km > radius) continue;
    nearby.push({ customer: c, distanceKm: km });
  }

  nearby.sort((a, b) => {
    const pr = (PRIO_RANK[a.customer.priority] ?? 9) - (PRIO_RANK[b.customer.priority] ?? 9);
    if (pr !== 0) return pr;
    return a.distanceKm - b.distanceKm;
  });

  if (!nearby.length) return [];

  const uniqueDates = [...new Set(slotDates)];
  return uniqueDates.map((date) => {
    const [y, m, d] = date.split('-');
    return {
      date,
      dateLabel: `${d}.${m}.${y}`,
      nearbyNames: nearby.slice(0, limit).map((n) => n.customer.name),
    };
  });
}
