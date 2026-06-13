/**
 * Serbia JN Portal (jnportal.ujn.gov.rs) – BLOCKED: API requires registration
 *
 * Research (2026-06): /api/ocds/releases → 401 Unauthorized.
 * portal.ujn.gov.rs has no public REST without credentials.
 * TED does not cover Serbia (non-EU). Manual search at jnportal.ujn.gov.rs.
 */

export async function fetchJnPortalRsTenders() {
  console.warn('[JN Portal RS] API erfordert Registrierung – kein öffentlicher Feed');
  return {
    tenders: [],
    source: 'jnportal-rs-stub',
    live: false,
    error: 'JN Portal RS: 401 – API-Zugang erforderlich',
  };
}
