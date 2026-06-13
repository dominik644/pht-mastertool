/**
 * Albania e-Prokurimi (e-prokurimi.app.gov.al) – BLOCKED: no public API
 *
 * Research (2026-06): openprocurement.al returns HTML landing page, not OCDS JSON.
 * National portal requires registration for search.
 */

export async function fetchEProkurimiAlTenders() {
  console.warn('[e-Prokurimi AL] Keine öffentliche API');
  return {
    tenders: [],
    source: 'eprokurimi-al-stub',
    live: false,
    error: 'e-Prokurimi AL: kein öffentliches API',
  };
}
