/**
 * Slovenia ENAROCANJE – BLOCKED: no public REST/OCDS API
 *
 * Research (2026-06): www.enarocanje.si is a web portal without a public search
 * API. Probed /api/notices → 404. TED covers EU-threshold notices.
 */

export async function fetchEnarocanjeSiTenders() {
  console.warn('[ENAROCANJE SI] Keine öffentliche API');
  return {
    tenders: [],
    source: 'enarocanje-si-stub',
    live: false,
    error: 'ENAROCANJE SI: kein öffentliches API',
  };
}
