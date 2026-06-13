/**
 * Belgium e-Procurement (enot.publicprocurement.be) – BLOCKED: OAuth API credentials
 *
 * Research (2026-06): BOSA e-Procurement API requires onboarding via Helpdesk
 * (PUBPROC_CLIENT_ID/SECRET). No anonymous public search endpoint. OpenTender BE
 * bulk (opentender.eu/be, CC BY-NC-SA) is not a live API.
 */

export async function fetchBelgiumEprocTenders() {
  console.warn('[e-Procurement BE] API-Zugang nur über BOSA-Onboarding');
  return {
    tenders: [],
    source: 'be-eproc-stub',
    live: false,
    error: 'e-Procurement BE: OAuth-API nur mit BOSA-Zugang',
  };
}
