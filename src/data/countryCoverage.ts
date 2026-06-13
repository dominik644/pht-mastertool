import { COUNTRY_MAP, resolveRegion } from '../../lib/tenders/regions.js';
import type { Tender } from '../types/tender';

export type CoverageStatus = 'covered' | 'partial' | 'gap';

export interface CountryCoverageEntry {
  code: string;
  name: string;
  region: string;
  baseStatus: CoverageStatus;
  providers: string[];
  portalName?: string;
  portalUrl?: string;
  notes: string;
  actionPlan: string[];
  /** Prominent gap examples for review (e.g. Hungary, Switzerland) */
  highlight?: boolean;
}

export interface MergedCountryCoverage extends CountryCoverageEntry {
  tenderCount: number;
  liveProviders: string[];
  effectiveStatus: CoverageStatus;
}

export const ALLOWED_COVERAGE_REGIONS = [
  'Europa',
  'DACH',
  'UK',
  'Afrika',
  'Middle East',
  'Latin America',
  'Oceania',
  'North America',
] as const;

export type CoverageRegion = (typeof ALLOWED_COVERAGE_REGIONS)[number];

const TED = 'TED (EU)';
const UK_PROVIDERS = 'Find a Tender · Contracts Finder · OCDS';
const PROZORRO = 'Prozorro (UA)';
const ETENDERS_ZA = 'eTenders RSA';
const BBG = 'BBG Österreich';
const SIMAP = 'SIMAP Schweiz';
const BUND_RSS = 'service.bund.de RSS';
const OEFFENTLICHEVERGABE = 'oeffentlichevergabe.de OCDS';
const TENDERNED_RSS = 'TenderNed RSS';
const DOFFIN = 'Doffin NO';
const HILMA = 'HILMA FI';
const AUSTENDER = 'AusTender OCDS';
const BOAMP = 'BOAMP FR';
const EZAMOWIENIA = 'e-Zamówienia BZP';
const PNCP = 'PNCP BR';
const MTENDER = 'MTender OCDS';
const CANADABUYS = 'CanadaBuys CSV';

function entry(
  code: string,
  overrides: Partial<CountryCoverageEntry> & Pick<CountryCoverageEntry, 'baseStatus' | 'providers' | 'notes' | 'actionPlan'>,
): CountryCoverageEntry {
  const name = COUNTRY_MAP[code as keyof typeof COUNTRY_MAP] ?? overrides.name ?? code;
  const region = resolveRegion(code) ?? overrides.region ?? 'Europa';
  return {
    code,
    name,
    region,
    portalName: overrides.portalName,
    portalUrl: overrides.portalUrl,
    highlight: overrides.highlight,
    baseStatus: overrides.baseStatus,
    providers: overrides.providers,
    notes: overrides.notes,
    actionPlan: overrides.actionPlan,
  };
}

/** Static coverage catalogue – target markets per regions.js (excl. USA & Asia) */
export const COUNTRY_COVERAGE: CountryCoverageEntry[] = [
  // DACH
  entry('DEU', {
    baseStatus: 'covered',
    providers: [TED, BUND_RSS, OEFFENTLICHEVERGABE],
    portalName: 'oeffentlichevergabe.de / service.bund.de',
    portalUrl: 'https://www.oeffentlichevergabe.de',
    notes: 'TED + service.bund.de RSS + oeffentlichevergabe.de OCDS (täglicher Export, kein Key).',
    actionPlan: [
      'CPV-Matching für DE-Vollabdeckung verfeinern',
      'evergabe-online.de / DTAD API evaluieren',
      'Länder-/Kommunalportale ergänzend kartieren',
    ],
  }),
  entry('AUT', {
    baseStatus: 'covered',
    providers: [BBG, TED],
    portalName: 'BBG / offenevergabe.at',
    portalUrl: 'https://www.bbg.gv.at',
    notes: 'BBG-Provider aktiv; TED ergänzend.',
    actionPlan: ['BBG-Parser erweitern', 'offenevergabe.at OCDS prüfen'],
  }),
  entry('CHE', {
    baseStatus: 'covered',
    providers: [SIMAP],
    highlight: true,
    portalName: 'simap.ch',
    portalUrl: 'https://www.simap.ch',
    notes: 'SIMAP REST-API aktiv (öffentliche Projektsuche, kein Key). Schweiz nicht im TED-Netz.',
    actionPlan: [
      'SIMAP CPV-Filter für Hygiene/Medizin verfeinern',
      'Kantonale Portale ergänzend kartieren',
      'Fristen aus Publikationsdetails nachziehen',
    ],
  }),

  // UK
  entry('GBR', {
    baseStatus: 'covered',
    providers: [UK_PROVIDERS],
    portalName: 'Find a Tender',
    portalUrl: 'https://www.find-tender.service.gov.uk',
    notes: 'Drei UK-Provider integriert.',
    actionPlan: ['OCDS-Felder für CPV erweitern'],
  }),

  // Europa – EU/EEA (TED partial)
  entry('FRA', {
    baseStatus: 'partial',
    providers: [TED, BOAMP],
    portalName: 'BOAMP / PLACE',
    portalUrl: 'https://www.boamp.fr',
    notes:
      'TED + BOAMP OpenDataSoft API integriert (DILA/data.gouv.fr, kein Key). ' +
      'Deckt nationale Avis de marché (APPEL_OFFRE) inkl. MAPA unter EU-Schwellen.',
    actionPlan: ['BOAMP CPV-Filter verfeinern', 'TED FR buyer filter', 'PLACE-Portale ergänzend'],
  }),
  entry('ITA', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'MEPA / ANAC',
    portalUrl: 'https://www.anticorruzione.it',
    notes: 'ANAC OCDS durch WAF blockiert (anacItProvider.js Stub). TED deckt EU-Schwellen.',
    actionPlan: ['ANAC OCDS Bulk/Whitelist', 'TED IT buyer filter'],
  }),
  entry('NLD', {
    baseStatus: 'partial',
    providers: [TED, TENDERNED_RSS],
    portalName: 'TenderNed',
    portalUrl: 'https://www.tenderned.nl',
    notes: 'TED + TenderNed Atom-RSS (öffentlich). XML-API benötigt Zugangsdaten; OCDS-Bulk halbjährlich.',
    actionPlan: ['TenderNed XML-API-Zugang beantragen', 'OCDS-JSON-Dataset als Vollabdeckung', 'TED NL buyer filter'],
  }),
  entry('BEL', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'e-Procurement Belgium',
    portalUrl: 'https://enot.publicprocurement.be',
    notes: 'BOSA OAuth-API nur nach Onboarding (belgiumEprocProvider.js Stub). TED ergänzend.',
    actionPlan: ['BOSA API-Zugang beantragen', 'OpenTender BE Bulk evaluieren'],
  }),
  entry('POL', {
    baseStatus: 'partial',
    providers: [TED, EZAMOWIENIA],
    portalName: 'BZP / e-Zamówienia',
    portalUrl: 'https://ezamowienia.gov.pl',
    notes: 'TED + BZP WebService API (mo-board/api/v1/notice, kein Key).',
    actionPlan: ['e-Zamówienia CPV-Filter verfeinern', 'TED PL buyer filter'],
  }),
  entry('DNK', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'udbud.dk',
    portalUrl: 'https://udbud.dk',
    notes: 'Kein Live-OCDS-API; KFST XLS-Statistik + OpenTender DK Bulk (udbuddkProvider.js Stub).',
    actionPlan: ['OpenTender DK Bulk', 'TED DK buyer filter'],
  }),
  entry('IRL', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'eTenders Ireland',
    portalUrl: 'https://www.etenders.gov.ie',
    notes: 'Nur 31MB CSV auf data.gov.ie, kein Live-API (etendersIeProvider.js Stub).',
    actionPlan: ['CSV-Ingestion als Batch-Job', 'TED IE buyer filter'],
  }),
  entry('ESP', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'Plataforma de Contratación',
    portalUrl: 'https://contrataciondelestado.es',
    notes: 'PCSP Atom-Syndication nicht maschinell zugänglich (pcspEsProvider.js Stub).',
    actionPlan: ['PCSP Partnerzugang', 'TED ES buyer filter'],
  }),
  entry('PRT', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'BASE / Vortal',
    portalUrl: 'https://www.base.gov.pt',
    notes: 'IMPIC APIBase2 benötigt Token (basePtProvider.js Stub). dados.gov Bulk wöchentlich.',
    actionPlan: ['IMPIC API-Token beantragen', 'TED PT buyer filter'],
  }),
  entry('SWE', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'opic.com / Mercell',
    portalUrl: 'https://www.opic.com',
    notes: 'Opic/Mercell kommerziell, kein öffentliches API (opicSeProvider.js Stub).',
    actionPlan: ['Opic-Partnerschaft', 'TED SE buyer filter'],
  }),
  entry('FIN', {
    baseStatus: 'partial',
    providers: [TED, HILMA],
    portalName: 'HILMA',
    portalUrl: 'https://www.hankintailmoitukset.fi',
    notes: 'TED + HILMA AVP API integriert (HILMA_API_KEY in Vercel).',
    actionPlan: ['HILMA CPV-Filter verfeinern', 'TED FI buyer filter'],
  }),
  entry('GRC', { baseStatus: 'partial', providers: [TED], portalName: 'ESIDIS / promitheus.gov.gr', portalUrl: 'https://promitheus.gov.gr', notes: 'TED; griechisches ESIDIS.', actionPlan: ['ESIDIS scraping/API'] }),
  entry('CZE', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'NEN / Vestnik',
    portalUrl: 'https://nen.nipez.cz',
    notes: 'NEN/RVZ API nur mit NIPEZ-Zugang (nenCzProvider.js Stub).',
    actionPlan: ['NIPEZ API-Zugang', 'TED CZ buyer filter'],
  }),
  entry('ROU', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'SEAP / e-licitatie (SICAP)',
    portalUrl: 'https://www.e-licitatie.ro',
    notes:
      'SEAP/e-licitatie ist Angular-SPA ohne öffentliche REST/OCDS-API (elicitatieProvider.js Stub). ' +
      'TED deckt EU-Schwellen; nationale Unter-Schwellen-Vergaben fehlen. ' +
      'data.gov.ro bietet nur quartalsweise XLSX-Bulk (achizitii-publice-YYYY), kein Live-Feed.',
    actionPlan: [
      'OpenTender RO OCDS-Bulk (opentender.eu/ro, CC BY-NC-SA) evaluieren',
      'TED RO buyer-country als Übergang',
      'data.gov.ro XLSX-Bulk als Offline-Batch (nicht Vercel)',
      'Scraping nur mit Rechtsprüfung / Partnerzugang',
    ],
  }),
  entry('HUN', {
    baseStatus: 'partial',
    providers: [TED],
    highlight: true,
    portalName: 'EKR (ekr.gov.hu)',
    portalUrl: 'https://ekr.gov.hu',
    notes: 'EKR ist SPA-Portal ohne öffentliche REST-API (ekrProvider.js Stub). TED deckt EU-Schwellen; nationale Vergaben fehlen.',
    actionPlan: [
      'OpenTender HU OCDS-Bulk (CC BY-NC-SA) evaluieren',
      'TED HU buyer-country als Übergang',
      'EKR-Partnerzugang / Scraping nur mit Rechtsprüfung',
      'Manuelle Recherche über ekr.gov.hu (Registrierung nötig)',
    ],
  }),
  entry('SVK', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'JOSEPH / UVO',
    portalUrl: 'https://www.uvo.gov.sk',
    notes: 'UVO ohne Live-API; data.gov.sk Bulk (uvoSkProvider.js Stub).',
    actionPlan: ['data.gov.sk Bulk', 'TED SK buyer filter'],
  }),
  entry('BGR', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'CAIS / AOP',
    portalUrl: 'https://app.eop.bg',
    notes: 'eop.bg WAF/SPA (eopBgProvider.js Stub). TED deckt EU-Schwellen.',
    actionPlan: ['eop.bg Partnerzugang', 'TED BG buyer filter'],
  }),
  entry('HRV', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'EOJN',
    portalUrl: 'https://eojn.nn.hr',
    notes: 'EOJN nur monatliche Bulk-Downloads XML/OCDS (eojnHrProvider.js Stub).',
    actionPlan: ['EOJN Bulk-Ingestion', 'TED HR buyer filter'],
  }),
  entry('SVN', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'ENAROCANJE',
    portalUrl: 'https://www.enarocanje.si',
    notes: 'ENAROCANJE ohne öffentliches API (enarocanjeSiProvider.js Stub).',
    actionPlan: ['ENAROCANJE Feed recherchieren', 'TED SI buyer filter'],
  }),
  entry('LTU', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'CVP IS',
    portalUrl: 'https://viesiejipirkimai.lt',
    notes: 'CVP IS SPA ohne Live-API (cvpLtProvider.js Stub).',
    actionPlan: ['get.data.gov.lt Spinta evaluieren', 'TED LT buyer filter'],
  }),
  entry('LVA', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'IUB / eis.gov.lv',
    portalUrl: 'https://www.eis.gov.lv',
    notes: 'EIS ohne öffentliches API (eisLvProvider.js Stub).',
    actionPlan: ['EIS Open Data', 'TED LV buyer filter'],
  }),
  entry('EST', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'RIHA / hankintailmoitused.ee',
    portalUrl: 'https://riigihanked.riik.ee',
    notes: 'RIHA ohne öffentliches API (rihaEeProvider.js Stub).',
    actionPlan: ['RIHA API recherchieren', 'TED EE buyer filter'],
  }),
  entry('LUX', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'marches.public.lu',
    portalUrl: 'https://marches.public.lu',
    notes: 'marches.public.lu ohne öffentliches API (marchesLuProvider.js Stub).',
    actionPlan: ['marches.public.lu OCDS', 'TED LU buyer filter'],
  }),
  entry('MLT', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'etenders.gov.mt',
    portalUrl: 'https://www.etenders.gov.mt',
    notes: 'Malta eTenders SPA ohne API (etendersMtProvider.js Stub).',
    actionPlan: ['Malta eTenders API', 'TED MT buyer filter'],
  }),
  entry('CYP', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'eprocurement.gov.cy',
    portalUrl: 'https://www.eprocurement.gov.cy',
    notes: 'Zypern e-Procurement SPA ohne API (eprocurementCyProvider.js Stub).',
    actionPlan: ['Cyprus API recherchieren', 'TED CY buyer filter'],
  }),
  entry('NOR', {
    baseStatus: 'partial',
    providers: [TED, DOFFIN],
    highlight: true,
    portalName: 'Doffin',
    portalUrl: 'https://www.doffin.no',
    notes:
      'TED (EEA) + Doffin Public API v2 integriert. DOFFIN_API_KEY gesetzt, aber 401 „invalid subscription key“ ' +
      '→ Abo „Public API“ (nicht eSender Publish) im Developer Portal aktivieren.',
    actionPlan: [
      'Developer Portal: dof-notices-prod-api.developer.azure-api.net → Products → Public API',
      'DOFFIN_API_KEY in Vercel hinterlegen',
      'Doffin CPV-Filter für Hygiene/Medizin',
      'data.norge.no CSV-Bulk als Vollabdeckungs-Option',
    ],
  }),
  entry('ISL', { baseStatus: 'partial', providers: [TED], portalName: 'utbod.is', portalUrl: 'https://www.utbod.is', notes: 'TED EEA; utbod.is.', actionPlan: ['utbod.is feed'] }),
  entry('LIE', {
    baseStatus: 'partial',
    providers: [TED],
    portalName: 'LLV Vergabe',
    portalUrl: 'https://www.llv.li',
    notes: 'Kleinstaat – TED (EU/EEA) als Übergang; nationales LLV-Portal ohne API.',
    actionPlan: ['LLV manuell / SIMAP-CH Kooperation', 'TED LI buyer filter'],
  }),
  entry('UKR', { baseStatus: 'covered', providers: [PROZORRO, TED], portalName: 'Prozorro', portalUrl: 'https://prozorro.gov.ua', notes: 'Prozorro API integriert.', actionPlan: ['Prozorro CPV-Filter verfeinern'] }),
  entry('MDA', {
    baseStatus: 'partial',
    providers: [MTENDER],
    portalName: 'MTender',
    portalUrl: 'https://mtender.gov.md',
    notes: 'MTender public OCDS API integriert (public.mtender.gov.md/tenders/cn, kein Key).',
    actionPlan: ['MTender CPV-Filter verfeinern', 'TED MDA buyer filter'],
  }),
  entry('BIH', { baseStatus: 'gap', providers: [], portalName: 'e-Nabavke', portalUrl: 'https://www.ejn.gov.ba', notes: 'Kein Provider.', actionPlan: ['e-Nabavke RS/FBiH'] }),
  entry('SRB', { baseStatus: 'gap', providers: [], portalName: 'JN Portal', portalUrl: 'https://jnportal.ujn.gov.rs', notes: 'Kein Provider.', actionPlan: ['Serbien JN Portal API'] }),
  entry('MNE', { baseStatus: 'gap', providers: [], portalName: 'CEJN', portalUrl: 'https://www.cejn.gov.me', notes: 'Kein Provider.', actionPlan: ['CEJN feed'] }),
  entry('MKD', { baseStatus: 'gap', providers: [], portalName: 'e-Nabavki', portalUrl: 'https://www.e-nabavki.gov.mk', notes: 'Kein Provider.', actionPlan: ['e-Nabavki MK'] }),
  entry('ALB', { baseStatus: 'gap', providers: [], portalName: 'e-Prokurimi', portalUrl: 'https://e-prokurimi.app.gov.al', notes: 'Kein Provider.', actionPlan: ['Albania e-Prokurimi'] }),
  entry('XKX', { baseStatus: 'gap', providers: [], name: 'Kosovo', portalName: 'e-Prokurimi KS', portalUrl: 'https://e-prokurimi.rks-gov.net', notes: 'Kein Provider.', actionPlan: ['Kosovo e-Procurement'] }),

  // Afrika
  entry('ZAF', { baseStatus: 'covered', providers: [ETENDERS_ZA], portalName: 'eTenders RSA', portalUrl: 'https://www.etenders.gov.za', notes: 'eTenders OCDS integriert.', actionPlan: ['ZA CPV-Mapping'] }),
  entry('KEN', { baseStatus: 'gap', providers: [], portalName: 'PPIP / IFMIS', portalUrl: 'https://tenders.go.ke', notes: 'Kein Provider.', actionPlan: ['Kenya tenders.go.ke API'] }),
  entry('EGY', { baseStatus: 'gap', providers: [], portalName: 'Egypt e-Procurement', portalUrl: 'https://etenders.gov.eg', notes: 'Kein Provider.', actionPlan: ['etenders.gov.eg'] }),
  entry('MAR', { baseStatus: 'gap', providers: [], portalName: 'Maroc Marchés Publics', portalUrl: 'https://www.marchespublics.gov.ma', notes: 'Kein Provider.', actionPlan: ['Marokko Portal'] }),
  entry('NGA', { baseStatus: 'gap', providers: [], portalName: 'Nigeria BPM', portalUrl: 'https://bpp.gov.ng', notes: 'Kein Provider.', actionPlan: ['BPP Nigeria e-Procurement'] }),
  entry('GHA', { baseStatus: 'gap', providers: [], portalName: 'GHANEPS', portalUrl: 'https://www.ghaneps.gov.gh', notes: 'Kein Provider.', actionPlan: ['GHANEPS API'] }),
  entry('TUN', { baseStatus: 'gap', providers: [], portalName: 'TUNISIE Tenders', portalUrl: 'https://www.tuneps.tn', notes: 'Kein Provider.', actionPlan: ['TUNEPS'] }),
  entry('DZA', { baseStatus: 'gap', providers: [], portalName: 'Algérie Marchés', portalUrl: 'https://www.marchespublics.dz', notes: 'Kein Provider.', actionPlan: ['DZ portal evaluieren'] }),
  entry('ETH', { baseStatus: 'gap', providers: [], portalName: 'Ethiopia e-GP', portalUrl: 'https://egp.gov.et', notes: 'Kein Provider.', actionPlan: ['e-GP Ethiopia'] }),
  entry('TZA', { baseStatus: 'gap', providers: [], portalName: 'Tanzania e-Procurement', portalUrl: 'https://www.taneps.go.tz', notes: 'Kein Provider.', actionPlan: ['TANEPS'] }),
  entry('UGA', { baseStatus: 'gap', providers: [], portalName: 'Uganda e-GP', portalUrl: 'https://egpuganda.go.ug', notes: 'Kein Provider.', actionPlan: ['e-GP Uganda'] }),
  entry('RWA', { baseStatus: 'gap', providers: [], portalName: 'Rwanda UMUCYO', portalUrl: 'https://www.umucyo.gov.rw', notes: 'Kein Provider.', actionPlan: ['UMUCYO'] }),
  entry('SEN', { baseStatus: 'gap', providers: [], portalName: 'Senegal ARMP', portalUrl: 'https://www.armp.sn', notes: 'Kein Provider.', actionPlan: ['ARMP feed'] }),
  entry('CIV', { baseStatus: 'gap', providers: [], name: 'Elfenbeinküste', portalName: 'Côte d\'Ivoire Marchés', portalUrl: 'https://www.marchespublics.ci', notes: 'Kein Provider.', actionPlan: ['CI marches publics'] }),
  entry('CMR', { baseStatus: 'gap', providers: [], name: 'Kamerun', portalName: 'Cameroon ARMP', portalUrl: 'https://www.armp.cm', notes: 'Kein Provider.', actionPlan: ['ARMP CM'] }),
  entry('MOZ', { baseStatus: 'gap', providers: [], name: 'Mosambik', portalName: 'Mozambique e-GP', portalUrl: 'https://www.portaldogoverno.gov.mz', notes: 'Kein Provider.', actionPlan: ['MZ e-GP'] }),
  entry('AGO', { baseStatus: 'gap', providers: [], name: 'Angola', portalName: 'Angola Procurement', portalUrl: 'https://www.minfin.gov.ao', notes: 'Kein Provider.', actionPlan: ['Angola portal'] }),
  entry('NAM', { baseStatus: 'gap', providers: [], name: 'Namibia', portalName: 'Namibia e-Procurement', portalUrl: 'https://www.mof.gov.na', notes: 'Kein Provider.', actionPlan: ['Central Procurement Board'] }),
  entry('BWA', { baseStatus: 'gap', providers: [], name: 'Botswana', portalName: 'Botswana PPADB', portalUrl: 'https://www.ppadb.co.bw', notes: 'Kein Provider.', actionPlan: ['PPADB tenders'] }),
  entry('ZWE', { baseStatus: 'gap', providers: [], name: 'Simbabwe', portalName: 'Zimbabwe PRAZ', portalUrl: 'https://www.praz.org.zw', notes: 'Kein Provider.', actionPlan: ['PRAZ portal'] }),

  // Middle East
  entry('ARE', { baseStatus: 'gap', providers: [], portalName: 'UAE Federal Tenders', portalUrl: 'https://www.etimad.ae', notes: 'Kein Provider; Dubai/Abu Dhabi separat.', actionPlan: ['etimad.ae / Dubai eSupply'] }),
  entry('SAU', { baseStatus: 'gap', providers: [], portalName: 'Etimad KSA', portalUrl: 'https://etimad.sa', notes: 'Kein Provider.', actionPlan: ['Saudi Etimad API'] }),
  entry('QAT', { baseStatus: 'gap', providers: [], portalName: 'Qatar Tenders', portalUrl: 'https://www.monaqasat.gov.qa', notes: 'Kein Provider.', actionPlan: ['Monaqasat'] }),
  entry('ISR', { baseStatus: 'gap', providers: [], portalName: 'Israel MOF Tenders', portalUrl: 'https://www.mr.gov.il', notes: 'Kein Provider.', actionPlan: ['Israel unified tender portal'] }),
  entry('TUR', { baseStatus: 'gap', providers: [], portalName: 'EKAP / ihale.gov.tr', portalUrl: 'https://www.ihale.gov.tr', notes: 'Kein Provider; EKAP national.', actionPlan: ['EKAP OCDS/API'] }),
  entry('BHR', { baseStatus: 'gap', providers: [], portalName: 'Bahrain Tender Board', portalUrl: 'https://www.tenderboard.gov.bh', notes: 'Kein Provider.', actionPlan: ['Tender Board BH'] }),
  entry('OMN', { baseStatus: 'gap', providers: [], portalName: 'Oman Tenders', portalUrl: 'https://www.tenderboard.gov.om', notes: 'Kein Provider.', actionPlan: ['Oman Tender Board'] }),
  entry('KWT', { baseStatus: 'gap', providers: [], portalName: 'Kuwait CAPT', portalUrl: 'https://www.capt.gov.kw', notes: 'Kein Provider.', actionPlan: ['CAPT Kuwait'] }),
  entry('JOR', { baseStatus: 'gap', providers: [], portalName: 'Jordan JONEPS', portalUrl: 'https://www.joneps.gov.jo', notes: 'Kein Provider.', actionPlan: ['JONEPS'] }),
  entry('LBN', { baseStatus: 'gap', providers: [], portalName: 'Lebanon Tenders', portalUrl: 'https://www.buyandsell.gov.lb', notes: 'Kein Provider.', actionPlan: ['buyandsell.gov.lb'] }),
  entry('IRQ', { baseStatus: 'gap', providers: [], portalName: 'Iraq e-Procurement', portalUrl: 'https://www.itp.iq', notes: 'Kein Provider.', actionPlan: ['Iraq ITP'] }),
  entry('IRN', { baseStatus: 'gap', providers: [], portalName: 'Iran SETAD', portalUrl: 'https://www.setadiran.ir', notes: 'Kein Provider; Sanktionen beachten.', actionPlan: ['Rechtliche Prüfung vor Anbindung'] }),

  // Latin America
  entry('BRA', {
    baseStatus: 'partial',
    providers: [PNCP],
    portalName: 'ComprasNet / PNCP',
    portalUrl: 'https://pncp.gov.br',
    notes:
      'PNCP Consulta-API integriert (öffentlich, kein Key). ' +
      'Abfrage über /v1/contratacoes/publicacao mit Modalitäts-Codes (Pregão, Concorrência, Dispensa).',
    actionPlan: ['PNCP CPV-Filter verfeinern', 'ComprasNet-Federal ergänzend'],
  }),
  entry('ARG', { baseStatus: 'gap', providers: [], portalName: 'Argentina COMPRAR', portalUrl: 'https://www.argentina.gob.ar/comprar', notes: 'Kein Provider.', actionPlan: ['COMPRAR API'] }),
  entry('CHL', { baseStatus: 'gap', providers: [], portalName: 'Chile Mercado Público', portalUrl: 'https://www.mercadopublico.cl', notes: 'Kein Provider.', actionPlan: ['Mercado Público API'] }),
  entry('COL', { baseStatus: 'gap', providers: [], portalName: 'Colombia SECOP', portalUrl: 'https://www.colombiacompra.gov.co', notes: 'Kein Provider.', actionPlan: ['SECOP II API'] }),
  entry('PER', { baseStatus: 'gap', providers: [], portalName: 'Peru SEACE', portalUrl: 'https://www.seace.gob.pe', notes: 'Kein Provider.', actionPlan: ['SEACE OCDS'] }),
  entry('MEX', { baseStatus: 'gap', providers: [], portalName: 'CompraNet México', portalUrl: 'https://compranet.hacienda.gob.mx', notes: 'Kein Provider.', actionPlan: ['CompraNet API'] }),
  entry('URY', { baseStatus: 'gap', providers: [], name: 'Uruguay', portalName: 'ARCE', portalUrl: 'https://www.gub.uy/arce', notes: 'Kein Provider.', actionPlan: ['ARCE Uruguay'] }),
  entry('PRY', { baseStatus: 'gap', providers: [], name: 'Paraguay', portalName: 'Paraguay DNCP', portalUrl: 'https://www.contrataciones.gov.py', notes: 'Kein Provider.', actionPlan: ['DNCP API'] }),
  entry('BOL', { baseStatus: 'gap', providers: [], name: 'Bolivien', portalName: 'Bolivia SICOES', portalUrl: 'https://www.sicoes.gob.bo', notes: 'Kein Provider.', actionPlan: ['SICOES'] }),
  entry('ECU', { baseStatus: 'gap', providers: [], name: 'Ecuador', portalName: 'Ecuador SERCOP', portalUrl: 'https://www.compraspublicas.gob.ec', notes: 'Kein Provider.', actionPlan: ['SERCOP API'] }),
  entry('VEN', { baseStatus: 'gap', providers: [], name: 'Venezuela', portalName: 'Venezuela SIGECO', portalUrl: 'https://www.ucab.edu.ve', notes: 'Kein Provider; politische Lage.', actionPlan: ['Manuelle Recherche'] }),
  entry('CRI', { baseStatus: 'gap', providers: [], name: 'Costa Rica', portalName: 'SICOP CR', portalUrl: 'https://www.sicop.go.cr', notes: 'Kein Provider.', actionPlan: ['SICOP Costa Rica'] }),
  entry('PAN', { baseStatus: 'gap', providers: [], name: 'Panama', portalName: 'PanamaCompra', portalUrl: 'https://www.panamacompra.gob.pa', notes: 'Kein Provider.', actionPlan: ['PanamaCompra'] }),
  entry('GTM', { baseStatus: 'gap', providers: [], name: 'Guatemala', portalName: 'Guatecompras', portalUrl: 'https://www.guatecompras.gt', notes: 'Kein Provider.', actionPlan: ['Guatecompras'] }),
  entry('HND', { baseStatus: 'gap', providers: [], name: 'Honduras', portalName: 'HonduCompras', portalUrl: 'https://www.honducompras.gob.hn', notes: 'Kein Provider.', actionPlan: ['HonduCompras'] }),
  entry('SLV', { baseStatus: 'gap', providers: [], name: 'El Salvador', portalName: 'Comprasal', portalUrl: 'https://www.comprasal.gob.sv', notes: 'Kein Provider.', actionPlan: ['Comprasal'] }),
  entry('NIC', { baseStatus: 'gap', providers: [], name: 'Nicaragua', portalName: 'Nicaragua NICAP', portalUrl: 'https://www.nicaraguacompra.gob.ni', notes: 'Kein Provider.', actionPlan: ['NICAP'] }),
  entry('DOM', { baseStatus: 'gap', providers: [], name: 'Dominikanische Republik', portalName: 'Dominican Republic', portalUrl: 'https://www.dgcp.gob.do', notes: 'Kein Provider.', actionPlan: ['DGCP DO'] }),
  entry('CUB', { baseStatus: 'gap', providers: [], name: 'Kuba', portalName: '—', notes: 'Kein Provider; eingeschränkter Marktzugang.', actionPlan: ['Manuelle Recherche'] }),
  entry('JAM', { baseStatus: 'gap', providers: [], name: 'Jamaika', portalName: 'Jamaica GOJ EPPS', portalUrl: 'https://www.govjamaica.com', notes: 'Kein Provider.', actionPlan: ['GOJ EPPS'] }),
  entry('TTO', { baseStatus: 'gap', providers: [], name: 'Trinidad und Tobago', portalName: 'TT e-Tender', portalUrl: 'https://www.ttconnect.gov.tt', notes: 'Kein Provider.', actionPlan: ['TT e-Tender portal'] }),

  // Oceania
  entry('AUS', {
    baseStatus: 'partial',
    providers: [AUSTENDER],
    portalName: 'AusTender',
    portalUrl: 'https://www.tenders.gov.au',
    notes: 'AusTender OCDS API integriert (öffentlich, kein Key).',
    actionPlan: ['AusTender CPV/UNSPSC-Mapping', 'State-level Portale ergänzen'],
  }),
  entry('NZL', {
    baseStatus: 'gap',
    providers: [],
    portalName: 'GETS New Zealand',
    portalUrl: 'https://www.gets.govt.nz',
    notes: 'GETS nur CSV-Bulk auf mbie.govt.nz (getsNzProvider.js Stub).',
    actionPlan: ['GETS CSV-Ingestion', 'ExternalIndex scraping evaluieren'],
  }),
  entry('FJI', { baseStatus: 'gap', providers: [], name: 'Fidschi', portalName: 'Fiji Government Tenders', portalUrl: 'https://www.finance.gov.fj', notes: 'Kein Provider.', actionPlan: ['Fiji tenders'] }),
  entry('PNG', { baseStatus: 'gap', providers: [], name: 'Papua-Neuguinea', portalName: 'PNG Central Supply', portalUrl: 'https://www.finance.gov.pg', notes: 'Kein Provider.', actionPlan: ['PNG procurement'] }),

  // North America (excl. USA)
  entry('CAN', {
    baseStatus: 'partial',
    providers: [CANADABUYS],
    portalName: 'CanadaBuys',
    portalUrl: 'https://canadabuys.canada.ca',
    notes: 'CanadaBuys newTenderNotice-CSV (2h-Refresh, ~400 Zeilen/Tag). Kein REST-Search.',
    actionPlan: ['openTenderNotice-Bulk für Archiv', 'Provinz-Portale ergänzen'],
  }),
];

const STATUS_RANK: Record<CoverageStatus, number> = { gap: 0, partial: 1, covered: 2 };

function normalizeCountryKey(name: string): string {
  return name.toLowerCase().trim();
}

/** Build alias map: country name / code → ISO code */
const NAME_TO_CODE = new Map<string, string>();
for (const c of COUNTRY_COVERAGE) {
  NAME_TO_CODE.set(normalizeCountryKey(c.name), c.code);
  NAME_TO_CODE.set(normalizeCountryKey(c.code), c.code);
}
NAME_TO_CODE.set('uk', 'GBR');
NAME_TO_CODE.set('österreich', 'AUT');
NAME_TO_CODE.set('austria', 'AUT');
NAME_TO_CODE.set('germany', 'DEU');
NAME_TO_CODE.set('deutschland', 'DEU');
NAME_TO_CODE.set('switzerland', 'CHE');
NAME_TO_CODE.set('schweiz', 'CHE');
NAME_TO_CODE.set('hungary', 'HUN');
NAME_TO_CODE.set('ungarn', 'HUN');
NAME_TO_CODE.set('south africa', 'ZAF');
NAME_TO_CODE.set('südafrika', 'ZAF');
NAME_TO_CODE.set('ukraine', 'UKR');

function resolveTenderCountryCode(country: string): string | null {
  const key = normalizeCountryKey(country);
  return NAME_TO_CODE.get(key) ?? null;
}

export function mergeCountryCoverage(tenders: Tender[]): MergedCountryCoverage[] {
  const countByCode = new Map<string, number>();
  const providersByCode = new Map<string, Set<string>>();

  for (const t of tenders) {
    const code = resolveTenderCountryCode(t.country);
    if (!code) continue;
    countByCode.set(code, (countByCode.get(code) ?? 0) + 1);
    if (t.sourcePlatform) {
      const set = providersByCode.get(code) ?? new Set<string>();
      set.add(t.sourcePlatform);
      providersByCode.set(code, set);
    }
  }

  return COUNTRY_COVERAGE.map((entry) => {
    const tenderCount = countByCode.get(entry.code) ?? 0;
    const liveProviders = [...(providersByCode.get(entry.code) ?? [])].sort();

    let effectiveStatus = entry.baseStatus;

    if (entry.providers.length > 0 && entry.baseStatus === 'covered') {
      effectiveStatus = 'covered';
    } else if (tenderCount > 0 && entry.baseStatus === 'gap' && !entry.highlight) {
      effectiveStatus = 'partial';
    } else if (tenderCount > 0 && entry.baseStatus === 'gap' && entry.highlight) {
      effectiveStatus = tenderCount >= 5 ? 'partial' : 'gap';
    } else if (tenderCount > 0 && entry.baseStatus === 'partial') {
      effectiveStatus = entry.providers.some((p) => !p.includes('TED')) ? 'covered' : 'partial';
    }

    if (liveProviders.length > 0 && effectiveStatus === 'gap') {
      effectiveStatus = 'partial';
    }

    return { ...entry, tenderCount, liveProviders, effectiveStatus };
  });
}

export function coverageStats(merged: MergedCountryCoverage[]) {
  const covered = merged.filter((c) => c.effectiveStatus === 'covered').length;
  const partial = merged.filter((c) => c.effectiveStatus === 'partial').length;
  const gaps = merged.filter((c) => c.effectiveStatus === 'gap').length;
  const highlighted = merged.filter((c) => c.highlight);
  return { total: merged.length, covered, partial, gaps, highlighted };
}

export function statusLabel(status: CoverageStatus): string {
  switch (status) {
    case 'covered': return 'Abgedeckt';
    case 'partial': return 'Teilweise';
    case 'gap': return 'Lücke';
  }
}

export function statusVariant(status: CoverageStatus): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'covered': return 'success';
    case 'partial': return 'warning';
    case 'gap': return 'danger';
  }
}

export function sortByStatus(a: MergedCountryCoverage, b: MergedCountryCoverage): number {
  const diff = STATUS_RANK[a.effectiveStatus] - STATUS_RANK[b.effectiveStatus];
  if (diff !== 0) return diff;
  if (a.highlight && !b.highlight) return -1;
  if (!a.highlight && b.highlight) return 1;
  return a.name.localeCompare(b.name, 'de');
}

/** Kompakte Lücken-Übersicht für SOPHIE & Command Center */
export function getCoverageGapsSummary(merged: MergedCountryCoverage[]) {
  const gaps = merged.filter((c) => c.effectiveStatus === 'gap');
  const highlighted = gaps.filter((c) => c.highlight);
  return {
    gapCount: gaps.length,
    partialCount: merged.filter((c) => c.effectiveStatus === 'partial').length,
    coveredCount: merged.filter((c) => c.effectiveStatus === 'covered').length,
    priorityGaps: highlighted.map((c) => ({
      code: c.code,
      name: c.name,
      portal: c.portalName,
      tenderCount: c.tenderCount,
      nextStep: c.actionPlan[0],
    })),
    topGaps: gaps
      .sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0))
      .slice(0, 8)
      .map((c) => c.name),
  };
}
