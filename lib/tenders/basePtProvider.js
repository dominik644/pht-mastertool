/**
 * Portugal BASE.gov.pt – BLOCKED: IMPIC API token required
 *
 * Research (2026-06): https://www.base.gov.pt/APIBase2 requires _AcessToken from
 * IMPIC Helpdesk approval. dados.gov.pt OCDS dataset is inactive (no files).
 * dados.gov weekly JSON/XLSX bulk is not a live search API.
 */

export async function fetchBasePtTenders() {
  console.warn('[BASE PT] IMPIC API-Token erforderlich');
  return {
    tenders: [],
    source: 'base-pt-stub',
    live: false,
    error: 'BASE.gov.pt: IMPIC API-Token nötig',
  };
}
