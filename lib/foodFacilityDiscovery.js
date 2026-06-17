/**
 * Lebensmittelbetriebe weltweit – kuratierte öffentliche Beschaffungsquellen (API/RSS/OCDS).
 * Kein Homepage-Scraping; TED + nationale Vergabeportale.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TED_FOOD_FACILITY_QUERIES,
  TED_FOOD_FACILITY_COUNTRY_QUERIES,
  PHT_FOOD_FACILITY_PROFILE_ID,
} from './phtConfig.js';
import { hasFoodFacilityOpportunitySignal } from './phtMatchRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDiscoveredSources() {
  try {
    const raw = readFileSync(join(__dirname, '../data/discovered-sources.json'), 'utf8');
    const data = JSON.parse(raw);
    return (data.sources ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      url: s.url,
      coverage: s.region ?? s.countries?.join(', ') ?? '',
      notes: s.focus?.join(', ') ?? s.notes ?? '',
      priority: s.priority,
    }));
  } catch {
    return [];
  }
}

/** Öffentliche Procurement-Feeds mit Food-/Agro-Bezug (aus data/discovered-sources.json). */
export const FOOD_FACILITY_PROCUREMENT_SOURCES = loadDiscoveredSources();

export const FOOD_FACILITY_ACTION_PLAN = [
  'TED_FOOD_FACILITY_QUERIES aktiv (Umbau/Neubau Lebensmittelbetriebe weltweit)',
  'Nationale OCDS-Portale: DE oeffentlichevergabe, CH SIMAP, UK Find a Tender',
  'Food-Facility-Match: Hygieneausstattung bei Anlagenbau (kein reines Hochbau-Matching)',
  'PHT-Homepage-Terms (pht.group) einmalig cachen für Produkt-Match',
  'LATAM/Afrika/Ozeanien: TED CY-Queries + PNCP, eTenders ZA, GETS NZ',
];

export function getFoodFacilityTedQueries() {
  return [...TED_FOOD_FACILITY_QUERIES, ...TED_FOOD_FACILITY_COUNTRY_QUERIES];
}

export function isFoodFacilityTender(text) {
  return hasFoodFacilityOpportunitySignal(text);
}

export function getFoodFacilityProfileId() {
  return PHT_FOOD_FACILITY_PROFILE_ID;
}

export function summarizeFoodFacilitySources() {
  return FOOD_FACILITY_PROCUREMENT_SOURCES.map((s) => ({
    id: s.id,
    name: s.name,
    coverage: s.coverage,
    type: s.type,
  }));
}
