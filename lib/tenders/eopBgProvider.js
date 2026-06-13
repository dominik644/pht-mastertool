/**
 * Bulgaria eop.bg – BLOCKED: WAF / no public API
 *
 * Research (2026-06): app.eop.bg returns 406 on automated requests. CAIS/eop
 * portal requires browser session. No free OCDS search API identified.
 */

export async function fetchEopBgTenders() {
  console.warn('[eop.bg] Kein zugängliches öffentliches API');
  return {
    tenders: [],
    source: 'eop-bg-stub',
    live: false,
    error: 'eop.bg: kein freies öffentliches API',
  };
}
