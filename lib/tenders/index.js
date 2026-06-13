/**
 * Zentraler Tender-Loader – alle verfügbaren Live-Provider (ohne USA & Asien)
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
import { fetchOeffentlichevergabeProviderTenders } from './oeffentlichevergabeProvider.js';
import { dedupeTenders, isExcluded, matchesPHT, normalizeTender } from './utils.js';

export { PHT_MATCH_KEYWORDS } from '../tedApi.js';

const PROVIDER_META = [
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
  { fn: fetchEkrTenders, label: 'EKR HU' },
  { fn: fetchElicitatieTenders, label: 'SEAP RO' },
  { fn: fetchBoampTenders, label: 'BOAMP FR' },
  { fn: fetchEzamowieniaTenders, label: 'e-Zamówienia PL' },
  { fn: fetchUdbudDkTenders, label: 'udbud.dk DK' },
  { fn: fetchBelgiumEprocTenders, label: 'e-Procurement BE' },
  { fn: fetchEtendersIeTenders, label: 'eTenders IE' },
  { fn: fetchBasePtTenders, label: 'BASE PT' },
  { fn: fetchNenCzTenders, label: 'NEN CZ' },
  { fn: fetchUvoSkTenders, label: 'UVO SK' },
  { fn: fetchEojnHrTenders, label: 'EOJN HR' },
  { fn: fetchEnarocanjeSiTenders, label: 'ENAROCANJE SI' },
  { fn: fetchCvpLtTenders, label: 'CVP LT' },
  { fn: fetchEisLvTenders, label: 'EIS LV' },
  { fn: fetchRihaEeTenders, label: 'RIHA EE' },
  { fn: fetchMarchesLuTenders, label: 'marches LU' },
  { fn: fetchEtendersMtTenders, label: 'eTenders MT' },
  { fn: fetchEprocurementCyTenders, label: 'eprocurement CY' },
  { fn: fetchEopBgTenders, label: 'eop.bg BG' },
  { fn: fetchPcspEsTenders, label: 'PCSP ES' },
  { fn: fetchAnacItTenders, label: 'ANAC IT' },
  { fn: fetchOpicSeTenders, label: 'Opic SE' },
];

/**
 * @returns {Promise<{ tenders: object[], source: string, regions: string[], total: number, error?: string, isDemo: boolean, liveProviders: string[] }>}
 */
export async function loadAllTenders() {
  const liveProviders = [];
  const errors = [];
  let tenders = [];

  const results = await Promise.allSettled(PROVIDER_META.map((p) => p.fn()));

  results.forEach((result, i) => {
    const { label } = PROVIDER_META[i];
    if (result.status === 'fulfilled') {
      const { tenders: batch = [], error, live } = result.value;
      if (batch.length) {
        tenders.push(...batch);
        liveProviders.push(label);
      } else if (error) {
        errors.push(`${label}: ${error}`);
      }
    } else {
      errors.push(`${label}: ${result.reason?.message || 'Fehler'}`);
    }
  });

  tenders = dedupeTenders(tenders.map(normalizeTender))
    .filter((t) => !isExcluded(t) && matchesPHT(t));

  const regions = [...new Set(tenders.map((t) => t.region))].sort();
  const noLiveData = liveProviders.length === 0;

  const providerCount = liveProviders.length;

  return {
    tenders,
    source: providerCount
      ? `Live: ${providerCount} Quelle${providerCount === 1 ? '' : 'n'} · ${liveProviders.join(' + ')}`
      : 'Keine Live-Daten',
    providerCount,
    regions,
    total: tenders.length,
    error: errors.filter(Boolean).join('; ') || undefined,
    isDemo: noLiveData,
    liveProviders,
    tedSource: results[0]?.status === 'fulfilled' ? results[0].value.source : undefined,
  };
}

export function filterByRegion(tenders, region) {
  if (!region || region === 'all') return tenders;
  return tenders.filter((t) => t.region === region);
}

export function filterByCountry(tenders, country) {
  if (!country || country === 'all') return tenders;
  return tenders.filter((t) => t.country.toLowerCase().includes(country.toLowerCase()));
}
