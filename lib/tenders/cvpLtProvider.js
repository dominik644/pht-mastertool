/**
 * Lithuania CVP IS – BLOCKED: no public live API
 *
 * Research (2026-06): viesiejipirkimai.lt is European Dynamics SPA without
 * public REST API. Open data via get.data.gov.lt (Spinta) exists but requires
 * complex model queries; OpenTender LT bulk is not live.
 */

export async function fetchCvpLtTenders() {
  console.warn('[CVP LT] Keine öffentliche Live-API');
  return {
    tenders: [],
    source: 'cvp-lt-stub',
    live: false,
    error: 'CVP IS LT: kein öffentliches Live-API',
  };
}
