/**
 * New Zealand GETS – BLOCKED: no live API (CSV bulk only)
 *
 * Research (2026-06): MBIE publishes GETS award notices as CSV bulk (~20MB) on
 * mbie.govt.nz. www.gets.govt.nz has no public REST/OCDS search API.
 */

export async function fetchGetsNzTenders() {
  console.warn('[GETS NZ] Keine Live-API – nur CSV-Bulk auf mbie.govt.nz');
  return {
    tenders: [],
    source: 'gets-nz-stub',
    live: false,
    error: 'GETS NZ: kein Live-API (nur CSV-Bulk)',
  };
}
