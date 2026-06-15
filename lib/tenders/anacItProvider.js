/**
 * Italy ANAC OCDS – BLOCKED: WAF rejects automated requests
 *
 * Research (2026-06-15): dati.anticorruzione.it/opendata/ocds/api/releases → HTTP 200 with
 * "Request Rejected" WAF page. No anonymous API key. Offline bulk on ANAC portal only.
 * Interim: TED IT buyer-country queries.
 */

export async function fetchAnacItTenders() {
  return {
    tenders: [],
    source: 'anac-it-stub',
    live: false,
    error: 'ANAC IT: WAF blockiert OCDS-API',
  };
}
