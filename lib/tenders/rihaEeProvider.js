/**
 * Estonia RIHA (riigihanked.riik.ee) – BLOCKED: no public REST API
 *
 * Research (2026-06): riigihanked.riik.ee has no public JSON search endpoint.
 * Probed /api/notices → 404. HILMA-style AVP API exists for Finland but not EE.
 */

export async function fetchRihaEeTenders() {
  console.warn('[RIHA EE] Keine öffentliche API');
  return {
    tenders: [],
    source: 'riha-ee-stub',
    live: false,
    error: 'RIHA EE: kein öffentliches API',
  };
}
