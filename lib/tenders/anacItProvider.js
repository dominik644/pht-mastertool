/**
 * Italy ANAC OCDS – BLOCKED: WAF on dati.anticorruzione.it
 *
 * Research (2026-06): dati.anticorruzione.it/opendata/ocds/ returns WAF
 * "Request Rejected" on serverless fetch. ANAC OCDS requires whitelisted access
 * or offline bulk download. MEPA/TED remain interim sources.
 */

export async function fetchAnacItTenders() {
  console.warn('[ANAC IT] OCDS-API durch WAF blockiert');
  return {
    tenders: [],
    source: 'anac-it-stub',
    live: false,
    error: 'ANAC IT: OCDS durch WAF blockiert',
  };
}
