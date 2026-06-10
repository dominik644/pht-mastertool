/**
 * Globaler Ausschreibungs-Daten-Service (Re-Export)
 */
export { loadAllTenders as searchGlobalTenders, PHT_MATCH_KEYWORDS } from './tenders/index.js';

export function filterByRegion(tenders, region) {
  if (!region || region === 'all') return tenders;
  return tenders.filter((t) => t.region === region);
}

export function filterByCountry(tenders, country) {
  if (!country || country === 'all') return tenders;
  return tenders.filter((t) => t.country.toLowerCase().includes(country.toLowerCase()));
}
