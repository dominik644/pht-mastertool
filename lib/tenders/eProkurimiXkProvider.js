/**
 * Kosovo e-Prokurimi (e-prokurimi.rks-gov.net) – BLOCKED: no public API
 *
 * Research (2026-06): /api/v1/notices → 404; portal is SPA without OCDS endpoint.
 */

export async function fetchEProkurimiXkTenders() {
  console.warn('[e-Prokurimi XK] Keine öffentliche API');
  return {
    tenders: [],
    source: 'eprokurimi-xk-stub',
    live: false,
    error: 'e-Prokurimi XK: kein öffentliches API',
  };
}
