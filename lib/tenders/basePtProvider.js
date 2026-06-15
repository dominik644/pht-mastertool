/**
 * Portugal BASE.gov.pt – BLOCKED: IMPIC API token required, BASE4 returns empty body
 *
 * Research (2026-06-15): APIBase2/ContratosPublicos → 404. BASE4 HTML search returns 0-byte body
 * on automated fetch (bot protection). dados.gov.pt CKAN API → 404. dados.gov OCDS dataset inactive.
 * IMPIC _AcessToken required for APIBase2. Interim: TED PT + ezamowienia not applicable; TED only.
 */

export async function fetchBasePtTenders() {
  return {
    tenders: [],
    source: 'base-pt-stub',
    live: false,
    error: 'BASE.gov.pt: IMPIC API-Token nötig, kein freies OCDS',
  };
}
