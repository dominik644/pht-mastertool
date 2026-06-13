/**
 * Luxembourg marches.public.lu – BLOCKED: no public REST/OCDS API
 *
 * Research (2026-06): marches.public.lu is a web portal. Probed /api/notices
 * → 404. TED covers EU-threshold Luxembourg procurements.
 */

export async function fetchMarchesLuTenders() {
  console.warn('[marches.public.lu] Keine öffentliche API');
  return {
    tenders: [],
    source: 'marches-lu-stub',
    live: false,
    error: 'marches.public.lu: kein öffentliches API',
  };
}
