/**
 * Ireland eTenders – BLOCKED: no live API (bulk CSV only)
 *
 * Research (2026-06): data.gov.ie hosts Public_Procurement_Opendata_Dataset.csv
 * (~31 MB, 84k rows) without a filterable live API. etenders.gov.ie is an
 * authenticated SPA. OpenTender IE bulk (opentender.eu/ie) is semi-annual.
 */

export async function fetchEtendersIeTenders() {
  console.warn('[eTenders IE] Keine Live-API – nur 31MB CSV-Bulk auf data.gov.ie');
  return {
    tenders: [],
    source: 'etenders-ie-stub',
    live: false,
    error: 'eTenders IE: kein Live-API (nur CSV-Bulk)',
  };
}
