/**
 * oeffentlichevergabe.de – deutscher Bekanntmachungsservice (OCDS Open Data)
 * https://www.oeffentlichevergabe.de/documentation/swagger-ui/opendata/index.html
 */

import {
  fetchOeffentlichevergabeTenders,
  OEFFENTLICHEVERGABE_DEFAULT_DAYS,
} from './oeffentlichevergabeFetch.js';

const API_PROXY = `/api/oeffentlichevergabe?days=${OEFFENTLICHEVERGABE_DEFAULT_DAYS}`;

async function fetchViaProxy() {
  const res = await fetch(API_PROXY, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(55000),
  });
  if (!res.ok) throw new Error(`oeffentlichevergabe.de ${res.status}`);
  const data = await res.json();
  return data.tenders ?? [];
}

export async function fetchOeffentlichevergabeProviderTenders() {
  try {
    const tenders = typeof window !== 'undefined'
      ? await fetchViaProxy()
      : await fetchOeffentlichevergabeTenders({ days: OEFFENTLICHEVERGABE_DEFAULT_DAYS });
    return {
      tenders,
      source: 'oeffentlichevergabe-ocds',
      live: tenders.length > 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oeffentlichevergabe.de Fehler';
    return { tenders: [], source: 'oeffentlichevergabe-error', error: message, live: false };
  }
}
