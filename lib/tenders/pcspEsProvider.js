/**
 * Spain contrataciondelestado (PCSP) – BLOCKED: syndication redirects to portal
 *
 * Research (2026-06-15): sindicacion Atom feeds return HTML redirect to wps/portal, not Atom XML.
 * contrataciondelestado.es has no documented anonymous JSON/OCDS search API.
 * datos.gob.es catalog API exists but no live tender search endpoint.
 * Interim: TED ES buyer-country queries.
 */

export async function fetchPcspEsTenders() {
  return {
    tenders: [],
    source: 'pcsp-es-stub',
    live: false,
    error: 'PCSP ES: Syndication nicht maschinell zugänglich',
  };
}
