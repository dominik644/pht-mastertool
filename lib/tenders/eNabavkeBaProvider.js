/**
 * Bosnia e-Nabavke (ejn.gov.ba / javnenabavke.gov.ba) – BLOCKED: no public API
 *
 * Research (2026-06): e-nabavke.gov.ba DNS unreachable; javnenabavke.gov.ba is Angular SPA.
 * Entity-level portals (RS/FBiH) without unified OCDS feed.
 */

export async function fetchENabavkeBaTenders() {
  console.warn('[e-Nabavke BA] Keine öffentliche API');
  return {
    tenders: [],
    source: 'enabavke-ba-stub',
    live: false,
    error: 'e-Nabavke BA: kein öffentliches API',
  };
}
