/**
 * Malta etenders.gov.mt – BLOCKED: SPA portal, no public API
 *
 * Research (2026-06): etenders.gov.mt is a European Dynamics e-procurement SPA.
 * Probed /api/notices → HTML shell. No anonymous REST/OCDS feed found.
 */

export async function fetchEtendersMtTenders() {
  console.warn('[eTenders MT] Keine öffentliche API');
  return {
    tenders: [],
    source: 'etenders-mt-stub',
    live: false,
    error: 'eTenders MT: SPA ohne öffentliches API',
  };
}
