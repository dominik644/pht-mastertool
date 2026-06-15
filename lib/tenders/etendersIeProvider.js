/**
 * Ireland eTenders – BLOCKED: no live API (bulk via etendersIeBulkProvider)
 *
 * Research (2026-06-15): etenders.gov.ie/api and /ocds/releases return HTML SPA, not JSON.
 * data.gov.ie CSV (~31 MB, CC BY 4.0) is the only open bulk source:
 *   https://assets.gov.ie/static/documents/7ba65f1b/Public_Procurement_Opendata_Dataset.csv
 * Filtered bulk: public/data/bulk/etenders-ie.json (scripts/bulk-ingest-ireland.mjs).
 * OpenTender IE on OCP is semi-annual (CC BY-NC-SA).
 */

export async function fetchEtendersIeTenders() {
  return {
    tenders: [],
    source: 'etenders-ie-stub',
    live: false,
    error: 'eTenders IE: kein Live-API (Bulk: etendersIeBulkProvider)',
  };
}
