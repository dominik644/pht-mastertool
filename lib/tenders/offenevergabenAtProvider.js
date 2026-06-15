/**
 * Austria offenevergaben.at – BLOCKED: no public OCDS/API (NGO aggregator)
 *
 * Research (2026-06-15): offenevergaben.at has no documented public API (/api/* → 404 JSON).
 * Platform scrapes data.gv.at open-data awards (≥€50k), not active tender OCDS.
 * Live coverage: BBG HTML parser (bbgProvider.js) + oeffentlichevergabe.de for DE cross-border.
 * data.gv.at CKAN API path changed (404 on legacy /katalog/api/3/).
 */

export async function fetchOffenevergabenAtTenders() {
  return {
    tenders: [],
    source: 'offenevergaben-at-stub',
    live: false,
    error: 'offenevergaben.at: kein öffentliches OCDS-API (BBG live)',
  };
}
