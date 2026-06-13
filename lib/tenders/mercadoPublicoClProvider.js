/**
 * Chile Mercado Público – Public API v1 (Ticket erforderlich)
 * GET https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json
 * Params: fecha=ddmmaaaa, ticket=MERCADOPUBLICO_TICKET, optional estado=activas|publicada
 * Ticket: https://api.mercadopublico.cl → „Participa“ (Clave Única, ~2 Werktage)
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_DIRECT = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';
const API_PROXY = '/api/tenders/mercadopublico';

function getTicket() {
  if (typeof process !== 'undefined' && process.env?.MERCADOPUBLICO_TICKET) {
    return process.env.MERCADOPUBLICO_TICKET;
  }
  return '';
}

function fmtDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
}

function apiRoot() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function mapLicitacion(lic) {
  const title = lic.Nombre || lic.Descripcion || `Mercado Público ${lic.CodigoExterno || lic.Codigo}`;
  const buyer = lic.Comprador?.NombreOrganismo || lic.Comprador?.NombreUnidad || '';
  const value = lic.MontoEstimado || lic.MontoTotal || 80000;

  return {
    id: `mp-cl-${String(lic.CodigoExterno || lic.Codigo).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Chile',
    countryCode: 'CHL',
    region: 'Latin America',
    budget: Number(value) > 0 ? Math.round(Number(value)) : 80000,
    currency: 'CLP',
    sourcePlatform: 'Mercado Público',
    sourceUrl: lic.CodigoExterno
      ? `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${lic.CodigoExterno}`
      : 'https://www.mercadopublico.cl',
    publicationDate: parseIsoDate(lic.Fechas?.FechaPublicacion || lic.FechaCreacion),
    submissionDeadline: parseIsoDate(lic.Fechas?.FechaCierre || lic.Fechas?.FechaFinal),
    description: `${title}. Organismo: ${buyer}. Estado: ${lic.Estado || ''}.`.slice(0, 800),
    industry: inferIndustry(`${title} ${lic.Descripcion || ''} ${buyer}`),
    cpvCodes: [],
  };
}

async function fetchDay(fecha) {
  const params = new URLSearchParams({ fecha, ticket: getTicket() });
  const res = await fetch(`${apiRoot()}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(25000),
  });
  if (res.status === 203 || res.status === 401) {
    throw new Error('Mercado Público Ticket ungültig (MERCADOPUBLICO_TICKET)');
  }
  if (!res.ok) throw new Error(`Mercado Público ${res.status}`);
  const data = await res.json();
  if (data.Codigo === 203) {
    throw new Error('Mercado Público Ticket ungültig (MERCADOPUBLICO_TICKET)');
  }
  const list = data.Listado ?? data.listado ?? [];
  return Array.isArray(list) ? list : [];
}

export async function fetchMercadoPublicoClTenders() {
  if (typeof window === 'undefined' && !getTicket()) {
    console.warn('[Mercado Público CL] MERCADOPUBLICO_TICKET nicht gesetzt – Provider übersprungen');
    return { tenders: [], source: 'mercadopublico-cl', live: false };
  }

  try {
    const days = [0, 1, 2, 3, 4].map((offset) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return fmtDate(d);
    });

    const batches = await Promise.allSettled(days.map(fetchDay));
    const tenders = [];
    for (const result of batches) {
      if (result.status !== 'fulfilled') continue;
      tenders.push(...result.value.map(mapLicitacion));
    }

    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'mercadopublico-cl', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mercado Público Fehler';
    console.warn('[Mercado Público CL]', message);
    return { tenders: [], source: 'mercadopublico-cl-error', error: message, live: false };
  }
}
