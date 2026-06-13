/**
 * Colombia SECOP II – datos.gov.co Socrata API (öffentlich, kein Key)
 * GET https://www.datos.gov.co/resource/p6dx-8zbt.json
 * Dataset: SECOP II Procesos de Contratación (p6dx-8zbt)
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_BASE = 'https://www.datos.gov.co/resource/p6dx-8zbt.json';
const API_PROXY = '/api/tenders/secop';

const OPEN_STATES = ['Abierto', 'Publicado', 'Evaluación'];

function apiRoot() {
  return typeof window !== 'undefined' ? API_PROXY : API_BASE;
}

function extractUrl(urlField) {
  if (!urlField) return 'https://www.colombiacompra.gov.co';
  if (typeof urlField === 'string') return urlField;
  return urlField.url || urlField.href || 'https://www.colombiacompra.gov.co';
}

function mapRecord(r) {
  const title = r.nombre_del_procedimiento || r.descripci_n_del_procedimiento || `SECOP ${r.id_del_proceso}`;
  const desc = r.descripci_n_del_procedimiento || title;
  const buyer = r.nombre_de_la_unidad_de || r.entidad || '';
  const value = Number(r.precio_base) || 80000;

  return {
    id: `secop-co-${String(r.id_del_proceso || r.referencia_del_proceso).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Kolumbien',
    countryCode: 'COL',
    region: 'Latin America',
    budget: value > 0 ? Math.round(value) : 80000,
    currency: 'COP',
    sourcePlatform: 'SECOP II',
    sourceUrl: extractUrl(r.urlproceso),
    publicationDate: parseIsoDate(r.fecha_de_ultima_publicaci || r.fecha_de_publicacion_del),
    submissionDeadline: parseIsoDate(r.fecha_de_publicacion_fase_3),
    description: `${desc}. Entidad: ${buyer}. Modalidad: ${r.modalidad_de_contratacion || ''}.`.slice(0, 800),
    industry: inferIndustry(`${title} ${desc} ${buyer}`),
    cpvCodes: r.codigo_principal_de_categoria ? [String(r.codigo_principal_de_categoria)] : [],
  };
}

export async function fetchSecopCoTenders() {
  const states = OPEN_STATES.map((s) => `'${s}'`).join(',');
  const params = {
    $where: `estado_del_procedimiento in (${states})`,
    $order: 'fecha_de_ultima_publicaci DESC',
    $limit: '50',
  };

  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${apiRoot()}?${qs}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`SECOP CO ${res.status}`);

    const data = await res.json();
    const tenders = (Array.isArray(data) ? data : []).map(mapRecord);
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'secop-co', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SECOP CO Fehler';
    console.warn('[SECOP CO]', message);
    return { tenders: [], source: 'secop-co-error', error: message, live: false };
  }
}
