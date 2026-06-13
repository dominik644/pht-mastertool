/**
 * Cyprus eprocurement.gov.cy – BLOCKED: SPA portal, no public API
 *
 * Research (2026-06): eprocurement.gov.cy is a European Dynamics SPA.
 * Probed /api/notices → HTML shell. No anonymous REST/OCDS feed found.
 */

export async function fetchEprocurementCyTenders() {
  console.warn('[eprocurement CY] Keine öffentliche API');
  return {
    tenders: [],
    source: 'eprocurement-cy-stub',
    live: false,
    error: 'eprocurement CY: SPA ohne öffentliches API',
  };
}
