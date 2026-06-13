/**
 * Canada CanadaBuys – BLOCKED: no live search API (bulk datasets)
 *
 * Research (2026-06): canadabuys.canada.ca publishes tender/award datasets as
 * downloadable CSV/JSON files (nightly refresh). No anonymous REST search API.
 * OCDS pilot data is static (250 contracts).
 */

export async function fetchCanadaBuysTenders() {
  console.warn('[CanadaBuys] Keine Live-Search-API – nur Bulk-Datasets');
  return {
    tenders: [],
    source: 'canadabuys-stub',
    live: false,
    error: 'CanadaBuys: kein Live-Search-API',
  };
}
