/**
 * Belgium e-Procurement (enot.publicprocurement.be) – BLOCKED: OAuth API credentials
 *
 * Research (2026-06-15): enot.publicprocurement.be and opendata.publicprocurement.be API hosts
 * unreachable (TLS/DNS from automated fetch). BOSA e-Procurement API requires onboarding
 * (PUBPROC_CLIENT_ID/SECRET). No anonymous OCDS search. OpenTender BE bulk (CC BY-NC-SA) offline.
 * Interim: TED BE buyer-country queries.
 */

export async function fetchBelgiumEprocTenders() {
  return {
    tenders: [],
    source: 'be-eproc-stub',
    live: false,
    error: 'e-Procurement BE: OAuth-API nur mit BOSA-Zugang',
  };
}
