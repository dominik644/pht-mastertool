/**
 * Sweden Opic/Mercell – BLOCKED: no public API
 *
 * Research (2026-06): opic.com / Mercell Sweden requires commercial subscription.
 * Probed api.opic.com → unreachable. TED covers EU-threshold Swedish notices.
 * OpenTender SE bulk (opentender.eu/se) is not a live API.
 */

export async function fetchOpicSeTenders() {
  console.warn('[Opic SE] Keine öffentliche API');
  return {
    tenders: [],
    source: 'opic-se-stub',
    live: false,
    error: 'Opic SE: kein öffentliches API',
  };
}
