/**
 * North Macedonia e-Nabavki (e-nabavki.gov.mk) – BLOCKED: SPA only
 *
 * Research (2026-06): /api/v1/notices → 404; portal is ASP.NET SPA.
 */

export async function fetchENabavkiMkTenders() {
  console.warn('[e-Nabavki MK] Keine öffentliche API');
  return {
    tenders: [],
    source: 'enabavki-mk-stub',
    live: false,
    error: 'e-Nabavki MK: kein öffentliches API',
  };
}
