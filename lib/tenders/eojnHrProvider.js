/**
 * Croatia EOJN – BLOCKED: monthly bulk only (XML/OCDS zip)
 *
 * Research (2026-06): eojn.nn.hr publishes machine-readable notices as monthly
 * ZIP/XML and OCDS contract registry JSON as monthly bulk downloads – no live
 * search REST API suitable for serverless polling.
 */

export async function fetchEojnHrTenders() {
  console.warn('[EOJN HR] Nur monatliche Bulk-Downloads, kein Live-API');
  return {
    tenders: [],
    source: 'eojn-hr-stub',
    live: false,
    error: 'EOJN HR: monatliche Bulk-Daten, kein Live-API',
  };
}
