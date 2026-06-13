/**
 * Czech NEN/RVZ – BLOCKED: API credentials required
 *
 * Research (2026-06): nen.nipez.cz public search has no anonymous REST API.
 * NEN WebService (nen-ws.nipez.cz) and Registr veřejných zakázek require
 * operator-approved access. Vestník open data is bulk-oriented.
 */

export async function fetchNenCzTenders() {
  console.warn('[NEN CZ] Keine öffentliche Live-API');
  return {
    tenders: [],
    source: 'nen-cz-stub',
    live: false,
    error: 'NEN CZ: API nur mit NIPEZ-Zugang',
  };
}
