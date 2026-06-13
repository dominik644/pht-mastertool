/**
 * Brazil PNCP – BLOCKED: consulta API requires modality params / JWT for write
 *
 * Research (2026-06): pncp.gov.br/api/consulta/v1 requires codigoModalidadeContratacao
 * and other filters; maintenance APIs need JWT login. No simple anonymous search
 * endpoint suitable for broad PHT polling on Vercel without deeper integration.
 */

export async function fetchPncpBrTenders() {
  console.warn('[PNCP BR] Consulta-API benötigt Modalitäts-Parameter; kein einfaches Live-Search');
  return {
    tenders: [],
    source: 'pncp-br-stub',
    live: false,
    error: 'PNCP BR: kein einfaches öffentliches Search-API',
  };
}
