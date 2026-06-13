/**
 * Montenegro CEJN (cejn.gov.me) – BLOCKED: no public REST/OCDS API
 *
 * Research (2026-06): cejn.gov.me unreachable from probe; portal is SPA without API docs.
 */

export async function fetchCejnMeTenders() {
  console.warn('[CEJN ME] Keine öffentliche API');
  return {
    tenders: [],
    source: 'cejn-me-stub',
    live: false,
    error: 'CEJN ME: kein öffentliches API',
  };
}
