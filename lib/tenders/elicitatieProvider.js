/**
 * Romania SEAP / e-licitatie.ro (SICAP) – BLOCKED: no public REST/OCDS API
 *
 * Research (2026-06):
 * - Portal https://www.e-licitatie.ro serves an Angular SPA (HTML shell only).
 * - Probed /api-pub/RFQ_PUBLIC_CANotice/get/ and /api-pub/C_PUBLIC_CANotice/get/ → 404.
 * - OCDS commitment (OGP RO0046) started but SICAP bulk export to data.gov.ro is unreliable.
 * - data.gov.ro publishes quarterly XLSX archives (achizitii-publice-YYYY), not a live API.
 * - SOAP webservices exist only for registered suppliers (catalog import), not public search.
 * - National sub-threshold procurements are not in TED.
 *
 * Alternatives for future integration:
 * - OpenTender RO OCDS bulk at opentender.eu/ro (CC BY-NC-SA, weekly, not live API)
 * - data.gov.ro quarterly XLSX ingestion (offline/batch job, not Vercel)
 * - TED RO buyer-country filter as interim source
 *
 * Scraping e-licitatie.ro on Vercel is intentionally not implemented.
 */

export async function fetchElicitatieTenders() {
  console.warn('[SEAP] Keine öffentliche API – nationaler RO-Vergabe-Feed ausstehend');
  return {
    tenders: [],
    source: 'elicitatie-stub',
    live: false,
    error: 'SEAP/e-licitatie: kein öffentliches API',
  };
}
