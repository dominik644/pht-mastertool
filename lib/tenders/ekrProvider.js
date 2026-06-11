/**
 * Hungary EKR (ekr.gov.hu) – BLOCKED: no public REST API
 *
 * Research (2026-06): ekr.gov.hu/portal serves an Angular SPA only.
 * Probed /portal/api/public/procurement/search → HTML shell;
 * /api/procurement/search → auth error (login required).
 * National sub-threshold procurements are not in TED.
 *
 * Alternatives for future integration:
 * - OpenTender HU OCDS bulk (CC BY-NC-SA)
 * - Partner/scraping access via NEKSZT
 * - Manual search at https://ekr.gov.hu (registration required)
 *
 * TED HU buyer-country filter remains the interim source.
 */

export async function fetchEkrTenders() {
  console.warn('[EKR] Keine öffentliche API – nationaler HU-Vergabe-Feed ausstehend');
  return {
    tenders: [],
    source: 'ekr-stub',
    live: false,
    error: 'EKR: SPA-Portal ohne öffentliche API',
  };
}
