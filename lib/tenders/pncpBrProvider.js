/**
 * Brazil PNCP – Consulta API (öffentlich, kein Key)
 * GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao
 * Erfordert codigoModalidadeContratacao (siehe PNCP_MANUALITIES).
 * Docs: https://pncp.gov.br/api/consulta/swagger-ui/index.html
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_BASE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';

/** PNCP Modalidade da Contratação – häufigste für breite Abdeckung */
export const PNCP_MODALIDADES = [
  { code: 6, name: 'Pregão - Eletrônico' },
  { code: 4, name: 'Concorrência - Eletrônica' },
  { code: 8, name: 'Dispensa de Licitação' },
  { code: 9, name: 'Inexigibilidade' },
  { code: 1, name: 'Leilão - Eletrônico' },
  { code: 2, name: 'Concorrência - Presencial' },
  { code: 3, name: 'Pregão - Presencial' },
  { code: 5, name: 'Tomada de Preços' },
  { code: 7, name: 'Convite' },
  { code: 10, name: 'Manifestação de Interesse' },
  { code: 11, name: 'Pré-qualificação' },
  { code: 12, name: 'Credenciamento' },
];

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function mapHit(hit) {
  const title = hit.objetoCompra || `PNCP ${hit.numeroControlePNCP || hit.numeroCompra}`;
  const buyer = hit.orgaoEntidade?.razaoSocial || hit.unidadeOrgao?.nomeUnidade || '';
  const value = hit.valorTotalEstimado || hit.valorTotalHomologado || 80000;

  return {
    id: `pncp-${String(hit.numeroControlePNCP || `${hit.orgaoEntidade?.cnpj}-${hit.sequencialCompra}`).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 56)}`,
    title: String(title).slice(0, 300),
    country: 'Brasilien',
    countryCode: 'BRA',
    region: 'Latin America',
    budget: Number(value) > 0 ? Math.round(Number(value)) : 80000,
    currency: 'BRL',
    sourcePlatform: 'PNCP',
    sourceUrl: hit.linkSistemaOrigem || hit.linkProcessoEletronico || 'https://pncp.gov.br',
    publicationDate: parseIsoDate(hit.dataPublicacaoPncp || hit.dataInclusao),
    submissionDeadline: parseIsoDate(hit.dataEncerramentoProposta || hit.dataAberturaProposta),
    description: `${title}. Órgão: ${buyer}. Modalidade: ${hit.modalidadeNome || ''}.`.slice(0, 800),
    industry: inferIndustry(`${title} ${buyer}`),
    cpvCodes: [],
  };
}

async function fetchModalityPage(codigoModalidadeContratacao, dataInicial, dataFinal, pagina = 1) {
  const params = new URLSearchParams({
    dataInicial,
    dataFinal,
    codigoModalidadeContratacao: String(codigoModalidadeContratacao),
    pagina: String(pagina),
    tamanhoPagina: '20',
  });

  const res = await fetch(`${API_BASE}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) throw new Error(`PNCP ${res.status} (modalidade ${codigoModalidadeContratacao})`);
  return res.json();
}

export async function fetchPncpBrTenders() {
  const to = new Date();
  const from = new Date(Date.now() - 21 * 86400000);
  const dataInicial = fmtDate(from);
  const dataFinal = fmtDate(to);

  try {
    const pages = await Promise.allSettled(
      PNCP_MODALIDADES.map((m) => fetchModalityPage(m.code, dataInicial, dataFinal, 1)),
    );

    const tenders = [];
    for (const result of pages) {
      if (result.status !== 'fulfilled') continue;
      const batch = (result.value.data ?? []).map(mapHit);
      tenders.push(...batch);
    }

    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'pncp-br', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PNCP Fehler';
    console.warn('[PNCP BR]', message);
    return { tenders: [], source: 'pncp-br-error', error: message, live: false };
  }
}
