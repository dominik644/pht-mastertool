/**
 * Spain contrataciondelestado (PCSP) – BLOCKED: syndication not accessible
 *
 * Research (2026-06): sindicacion/licitacionesPerfilContratante Atom feeds return
 * HTML redirect on automated fetch. PCSP has no documented anonymous JSON/OCDS
 * search API. TED covers EU-threshold Spanish notices.
 */

export async function fetchPcspEsTenders() {
  console.warn('[PCSP ES] Syndication-Feed nicht maschinell zugänglich');
  return {
    tenders: [],
    source: 'pcsp-es-stub',
    live: false,
    error: 'PCSP ES: kein freies Live-API',
  };
}
