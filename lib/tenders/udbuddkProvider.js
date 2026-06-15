/**
 * Denmark udbud.dk – BLOCKED: api.udbud.dk returns 503, no public OCDS search
 *
 * Research (2026-06-15): api.udbud.dk/api/v1/ocds/releases and /notices → 503 Service Unavailable.
 * datafordeler.dk has no tender API. udbud.dk/ocds/releases serves HTML portal, not JSON.
 * KFST XLS statistics only. OpenTender DK bulk on OCP (CC BY-NC-SA) is offline alternative.
 * Interim: TED DK buyer-country queries (phtConfig TED_COUNTRY_QUERIES).
 */

export async function fetchUdbudDkTenders() {
  return {
    tenders: [],
    source: 'udbuddk-stub',
    live: false,
    error: 'udbud.dk: kein öffentliches OCDS/REST-API (api.udbud.dk 503)',
  };
}
