/**
 * Latvia EIS (eis.gov.lv) – BLOCKED: no public REST API
 *
 * Research (2026-06): eis.gov.lv serves HTML portal only. Probed /api/notices
 * → 404. OpenTender LV bulk (opentender.eu/lv) is not a live API.
 */

export async function fetchEisLvTenders() {
  console.warn('[EIS LV] Keine öffentliche API');
  return {
    tenders: [],
    source: 'eis-lv-stub',
    live: false,
    error: 'EIS LV: kein öffentliches API',
  };
}
