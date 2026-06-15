/**
 * Sweden Opic/Mercell – BLOCKED: commercial API, kommersannons requires API key
 *
 * Research (2026-06-15): api.opic.com unreachable. kommersannons.se → 401 "No API key provided".
 * upphandlingsmyndigheten.se API → 404. OpenTender SE bulk (CC BY-NC-SA) is offline only.
 * Interim: TED SE buyer-country queries.
 */

export async function fetchOpicSeTenders() {
  return {
    tenders: [],
    source: 'opic-se-stub',
    live: false,
    error: 'Opic SE: kein freies öffentliches API',
  };
}
