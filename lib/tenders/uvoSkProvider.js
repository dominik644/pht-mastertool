/**
 * Slovakia UVO – BLOCKED: no live REST API
 *
 * Research (2026-06): uvo.gov.sk search is a web UI. Open data on data.gov.sk
 * is bulk download/SPARQL, not a tender search API. uvostat.sk API is commercial.
 * Blocker (2026-06): data.gov.sk / data.slovensko.sk CKAN-API returns SPA HTML only.
 */

export async function fetchUvoSkTenders() {
  console.warn('[UVO SK] Keine öffentliche Live-API');
  return {
    tenders: [],
    source: 'uvo-sk-stub',
    live: false,
    error: 'UVO SK: kein öffentliches Search-API',
  };
}
