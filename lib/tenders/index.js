/**
 * Zentraler Tender-Loader – Live-Provider parallel, Bulk lokal, Stubs übersprungen (Performance)
 */
import { fetchTEDTenders } from './tedProvider.js';
import { fetchUKContractsFinder } from './ukContractsFinderProvider.js';
import { fetchUKFindATender } from './ukFindATenderProvider.js';
import { fetchUKCfOcds } from './ukCfOcdsProvider.js';
import { fetchProzorroTenders } from './prozorroProvider.js';
import { fetchSouthAfricaTenders } from './southAfricaProvider.js';
import { fetchBBGTenders } from './bbgProvider.js';
import { fetchSimapTenders } from './simapProvider.js';
import { fetchBundTenders } from './bundProvider.js';
import { fetchTenderNedTenders } from './tendernedProvider.js';
import { fetchDoffinTenders } from './doffinProvider.js';
import { fetchHilmaTenders } from './hilmaProvider.js';
import { fetchAusTenderTenders } from './austenderProvider.js';
import { fetchEkrTenders } from './ekrProvider.js';
import { fetchElicitatieTenders } from './elicitatieProvider.js';
import { fetchBoampTenders } from './boampProvider.js';
import { fetchEzamowieniaTenders } from './ezamowieniaProvider.js';
import { fetchUdbudDkTenders } from './udbuddkProvider.js';
import { fetchBelgiumEprocTenders } from './belgiumEprocProvider.js';
import { fetchEtendersIeTenders } from './etendersIeProvider.js';
import { fetchBasePtTenders } from './basePtProvider.js';
import { fetchNenCzTenders } from './nenCzProvider.js';
import { fetchUvoSkTenders } from './uvoSkProvider.js';
import { fetchEojnHrTenders } from './eojnHrProvider.js';
import { fetchEojnHrBulkTenders } from './eojnHrBulkProvider.js';
import { fetchEnarocanjeSiTenders } from './enarocanjeSiProvider.js';
import { fetchCvpLtTenders } from './cvpLtProvider.js';
import { fetchEisLvTenders } from './eisLvProvider.js';
import { fetchRihaEeTenders } from './rihaEeProvider.js';
import { fetchMarchesLuTenders } from './marchesLuProvider.js';
import { fetchEtendersMtTenders } from './etendersMtProvider.js';
import { fetchEprocurementCyTenders } from './eprocurementCyProvider.js';
import { fetchEopBgTenders } from './eopBgProvider.js';
import { fetchPcspEsTenders } from './pcspEsProvider.js';
import { fetchAnacItTenders } from './anacItProvider.js';
import { fetchOpicSeTenders } from './opicSeProvider.js';
import { fetchGetsNzTenders } from './getsNzProvider.js';
import { fetchCanadaBuysTenders } from './canadaBuysProvider.js';
import { fetchMtenderMdTenders } from './mtenderMdProvider.js';
import { fetchPncpBrTenders } from './pncpBrProvider.js';
import { fetchSecopCoTenders } from './secopCoProvider.js';
import { fetchDiavgeiaGrTenders } from './diavgeiaGrProvider.js';
import { fetchMercadoPublicoClTenders } from './mercadoPublicoClProvider.js';
import { fetchJnPortalRsTenders } from './jnPortalRsProvider.js';
import { fetchENabavkeBaTenders } from './eNabavkeBaProvider.js';
import { fetchCejnMeTenders } from './cejnMeProvider.js';
import { fetchENabavkiMkTenders } from './eNabavkiMkProvider.js';
import { fetchEProkurimiAlTenders } from './eProkurimiAlProvider.js';
import { fetchEProkurimiXkTenders } from './eProkurimiXkProvider.js';
import { fetchOeffentlichevergabeProviderTenders } from './oeffentlichevergabeProvider.js';
import { fetchOpenTenderBulkTenders } from './openTenderBulkProvider.js';
import { fetchEtendersIeBulkTenders } from './etendersIeBulkProvider.js';
import { fetchOffenevergabenAtTenders } from './offenevergabenAtProvider.js';
import { formatBulkFreshnessDe, getBulkFreshness } from './bulkLoader.js';
import { dedupeTenders, isExcluded, matchesPHT, normalizeTender } from './utils.js';

export { PHT_MATCH_KEYWORDS } from '../tedApi.js';

/** Netzwerk-Live-Provider (parallel ausführen) */
export const LIVE_PROVIDERS = [
  { fn: fetchTEDTenders, label: 'TED API' },
  { fn: fetchUKContractsFinder, label: 'Contracts Finder' },
  { fn: fetchUKFindATender, label: 'Find a Tender' },
  { fn: fetchUKCfOcds, label: 'Contracts Finder OCDS' },
  { fn: fetchProzorroTenders, label: 'Prozorro (UA)' },
  { fn: fetchSouthAfricaTenders, label: 'eTenders RSA' },
  { fn: fetchBBGTenders, label: 'BBG Österreich' },
  { fn: fetchSimapTenders, label: 'SIMAP Schweiz' },
  { fn: fetchBundTenders, label: 'service.bund.de' },
  { fn: fetchOeffentlichevergabeProviderTenders, label: 'oeffentlichevergabe.de' },
  { fn: fetchTenderNedTenders, label: 'TenderNed NL' },
  { fn: fetchDoffinTenders, label: 'Doffin NO' },
  { fn: fetchHilmaTenders, label: 'HILMA FI' },
  { fn: fetchAusTenderTenders, label: 'AusTender AU' },
  { fn: fetchBoampTenders, label: 'BOAMP FR' },
  { fn: fetchEzamowieniaTenders, label: 'e-Zamówienia PL' },
  { fn: fetchGetsNzTenders, label: 'GETS NZ' },
  { fn: fetchCanadaBuysTenders, label: 'CanadaBuys' },
  { fn: fetchMtenderMdTenders, label: 'MTender MD' },
  { fn: fetchPncpBrTenders, label: 'PNCP BR' },
  { fn: fetchSecopCoTenders, label: 'SECOP II CO' },
  { fn: fetchDiavgeiaGrTenders, label: 'Diavgeia GR' },
  { fn: fetchMercadoPublicoClTenders, label: 'Mercado Público CL' },
  { fn: fetchEnarocanjeSiTenders, label: 'ENAROCANJE SI (TED RSS)' },
];

/** Offline-Bulk aus public/data/bulk/ (schnell, kein Upstream) */
export const BULK_PROVIDERS = [
  { fn: fetchOpenTenderBulkTenders, label: 'OpenTender Bulk' },
  { fn: fetchEtendersIeBulkTenders, label: 'eTenders IE Bulk' },
  { fn: fetchEojnHrBulkTenders, label: 'EOJN HR Bulk' },
  { fn: fetchAnacItTenders, label: 'ANAC IT Bulk' },
  { fn: fetchPcspEsTenders, label: 'PCSP ES Bulk' },
];

/** Stubs ohne Live-API – werden in loadAllTenders übersprungen (kein Netzwerk, keine Browser-Verzögerung) */
export const STUB_PROVIDERS = [
  { fn: fetchEkrTenders, label: 'EKR HU' },
  { fn: fetchElicitatieTenders, label: 'SEAP RO' },
  { fn: fetchUdbudDkTenders, label: 'udbud.dk DK' },
  { fn: fetchBelgiumEprocTenders, label: 'e-Procurement BE' },
  { fn: fetchEtendersIeTenders, label: 'eTenders IE' },
  { fn: fetchBasePtTenders, label: 'BASE PT' },
  { fn: fetchNenCzTenders, label: 'NEN CZ' },
  { fn: fetchUvoSkTenders, label: 'UVO SK' },
  { fn: fetchEojnHrTenders, label: 'EOJN HR' },
  { fn: fetchCvpLtTenders, label: 'CVP LT' },
  { fn: fetchEisLvTenders, label: 'EIS LV' },
  { fn: fetchRihaEeTenders, label: 'RIHA EE' },
  { fn: fetchMarchesLuTenders, label: 'marches LU' },
  { fn: fetchEtendersMtTenders, label: 'eTenders MT' },
  { fn: fetchEprocurementCyTenders, label: 'eprocurement CY' },
  { fn: fetchEopBgTenders, label: 'eop.bg BG' },
  { fn: fetchOpicSeTenders, label: 'Opic SE' },
  { fn: fetchOffenevergabenAtTenders, label: 'offenevergaben.at AT' },
  { fn: fetchJnPortalRsTenders, label: 'JN Portal RS' },
  { fn: fetchENabavkeBaTenders, label: 'e-Nabavke BA' },
  { fn: fetchCejnMeTenders, label: 'CEJN ME' },
  { fn: fetchENabavkiMkTenders, label: 'e-Nabavki MK' },
  { fn: fetchEProkurimiAlTenders, label: 'e-Prokurimi AL' },
  { fn: fetchEProkurimiXkTenders, label: 'e-Prokurimi XK' },
];

/** @deprecated Verwende LIVE_PROVIDERS + BULK_PROVIDERS */
export const PROVIDER_META = [...LIVE_PROVIDERS, ...BULK_PROVIDERS, ...STUB_PROVIDERS];

/** Mobile: fewer live providers, no bulk JSON (faster on slow networks). */
const MOBILE_LIVE_PROVIDER_COUNT = 14;

/** Desktop worldwide: all live + bulk providers. */
export const WORLDWIDE_PROVIDER_TOTAL = LIVE_PROVIDERS.length + BULK_PROVIDERS.length;

function resolveActiveProviders(mobile) {
  return mobile
    ? LIVE_PROVIDERS.slice(0, MOBILE_LIVE_PROVIDER_COUNT)
    : [...LIVE_PROVIDERS, ...BULK_PROVIDERS];
}

function collectProviderResults(activeProviders, results, state) {
  results.forEach((result, i) => {
    const { label } = activeProviders[i];
    if (result.status === 'fulfilled') {
      const { tenders: batch = [], error, bulkStaleWarning } = result.value;
      if (bulkStaleWarning) state.bulkWarnings.push(bulkStaleWarning);
      if (batch.length) {
        state.tenders.push(...batch);
        state.liveProviders.push(label);
      } else if (error) {
        state.errors.push(`${label}: ${error}`);
      }
    } else {
      state.errors.push(`${label}: ${result.reason?.message || 'Fehler'}`);
    }
  });
}

function finalizeTenderLoad(state, bulkMeta, tedSource) {
  const tenders = dedupeTenders(state.tenders.map(normalizeTender))
    .filter((t) => !isExcluded(t) && matchesPHT(t));
  const regions = [...new Set(tenders.map((t) => t.region))].sort();
  const providerCount = state.liveProviders.length;
  const allErrors = [...state.errors, ...state.bulkWarnings].filter(Boolean);

  return {
    tenders,
    source: providerCount
      ? `Live: ${providerCount} Quelle${providerCount === 1 ? '' : 'n'} · ${state.liveProviders.join(' + ')}`
      : 'Keine Live-Daten',
    providerCount,
    providersTotal: state.providersTotal,
    regions,
    total: tenders.length,
    error: allErrors.length ? allErrors.join('; ') : undefined,
    isDemo: providerCount === 0,
    liveProviders: state.liveProviders,
    tedSource,
    lastBulkUpdate: bulkMeta.lastBulkUpdate,
    bulkFreshnessLabel: formatBulkFreshnessDe(bulkMeta.lastBulkUpdate),
    bulkStale: bulkMeta.stale,
  };
}

/**
 * @param {{ mobile?: boolean }} [options]
 * @returns {Promise<{ tenders: object[], source: string, regions: string[], total: number, error?: string, isDemo: boolean, liveProviders: string[], providerCount: number, providersTotal?: number, lastBulkUpdate?: string, bulkFreshnessLabel?: string, bulkStale?: boolean }>}
 */
export async function loadAllTenders(options = {}) {
  const mobile = options.mobile === true;
  const activeProviders = resolveActiveProviders(mobile);
  const state = {
    tenders: [],
    liveProviders: [],
    errors: [],
    bulkWarnings: [],
    providersTotal: activeProviders.length,
  };

  const [results, bulkMeta] = await Promise.all([
    Promise.allSettled(activeProviders.map((p) => p.fn())),
    mobile ? Promise.resolve({ lastBulkUpdate: null, stale: false, files: [] }) : getBulkFreshness(),
  ]);

  collectProviderResults(activeProviders, results, state);
  const tedSource = results[0]?.status === 'fulfilled' ? results[0].value.source : undefined;
  return finalizeTenderLoad(state, bulkMeta, tedSource);
}

/**
 * Load providers sequentially in small batches – UI can merge after each step.
 * @param {{ mobile?: boolean, batchSize?: number, onProgress?: (partial: object) => void }} [options]
 */
export async function loadTendersIncremental(options = {}) {
  const mobile = options.mobile === true;
  const batchSize = Math.max(1, options.batchSize ?? 2);
  const activeProviders = resolveActiveProviders(mobile);
  const bulkMeta = mobile
    ? { lastBulkUpdate: null, stale: false, files: [] }
    : await getBulkFreshness();

  const state = {
    tenders: [],
    liveProviders: [],
    errors: [],
    bulkWarnings: [],
    providersTotal: activeProviders.length,
  };

  let tedSource;

  for (let i = 0; i < activeProviders.length; i += batchSize) {
    const batch = activeProviders.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((p) => p.fn()));
    if (!tedSource && results[0]?.status === 'fulfilled') {
      tedSource = results[0].value.source;
    }
    collectProviderResults(batch, results, state);

    const partial = finalizeTenderLoad(state, bulkMeta, tedSource);
    if (options.onProgress) {
      options.onProgress(partial);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return finalizeTenderLoad(state, bulkMeta, tedSource);
}

export function filterByRegion(tenders, region) {
  if (!region || region === 'all') return tenders;
  return tenders.filter((t) => t.region === region);
}

export function filterByCountry(tenders, country) {
  if (!country || country === 'all') return tenders;
  return tenders.filter((t) => t.country.toLowerCase().includes(country.toLowerCase()));
}
