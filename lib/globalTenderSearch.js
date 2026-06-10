/**
 * Globaler Ausschreibungs-Daten-Service
 * Lädt simulierte Ausschreibungen weltweit (ohne USA)
 */

const EXCLUDED_COUNTRIES = ['USA', 'United States', 'US', 'Vereinigte Staaten'];

const GLOBAL_TENDERS = [
  // Europa – TED
  { id: 'ted-816821-2024', title: 'Industrial hygiene stations for food processing plant', country: 'Deutschland', region: 'Europa', budget: 285000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/816821-2024', publicationDate: '2026-05-28', submissionDeadline: '2026-07-18', description: 'Complete hygiene entrance systems including hand disinfection and sole cleaning for meat processing.', industry: 'Food' },
  { id: 'ted-792341-2024', title: 'Low-pressure cleaning system for pharmaceutical GMP production', country: 'Frankreich', region: 'Europa', budget: 420000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/792341-2024', publicationDate: '2026-05-15', submissionDeadline: '2026-06-28', description: 'Niederdruck-Reinigungssystem für GMP-konforme Pharma-Produktion.', industry: 'Pharma' },
  { id: 'ted-845102-2024', title: 'Complete industrial washing plant for dairy processing', country: 'Dänemark', region: 'Europa', budget: 890000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/845102-2024', publicationDate: '2026-05-10', submissionDeadline: '2026-08-20', description: 'Industrial cleaning plant with CIP system for dairy processing factory.', industry: 'Food' },
  { id: 'ted-834567-2024', title: 'COMBI hygiene stations for university hospital extension', country: 'Italien', region: 'Europa', budget: 92000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/834567-2024', publicationDate: '2026-06-07', submissionDeadline: '2026-07-08', description: 'Multiple COMBI hygiene stations for university hospital new build.', industry: 'Hospital' },
  { id: 'ted-856789-2024', title: 'Facility hygiene and cleaning systems – industrial park', country: 'Belgien', region: 'Europa', budget: 198000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/856789-2024', publicationDate: '2026-06-04', submissionDeadline: '2026-07-15', description: 'Comprehensive hygiene system for multi-site industrial park.', industry: 'Production' },
  { id: 'ted-801234-2024', title: 'Hand hygiene systems and dispensers for production halls', country: 'Niederlande', region: 'Europa', budget: 44000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/801234-2024', publicationDate: '2026-06-08', submissionDeadline: '2026-06-25', description: 'EWG systems and dispensers for industrial production halls.', industry: 'Production' },
  { id: 'ted-889012-2024', title: 'Industrial crate washing system – meat processing', country: 'Polen', region: 'Europa', budget: 520000, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/889012-2024', publicationDate: '2026-05-30', submissionDeadline: '2026-08-10', description: 'Low-pressure washing system for crates and containers in meat plant.', industry: 'Food' },
  { id: 'ted-890123-2024', title: 'Hygiene dispensers for nursing home', country: 'Spanien', region: 'Europa', budget: 5200, currency: 'EUR', sourcePlatform: 'TED', sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/890123-2024', publicationDate: '2026-06-08', submissionDeadline: '2026-06-24', description: 'Supply of 25 disinfection dispensers for care home.', industry: 'Hospital' },

  // DACH
  { id: 'bbg-2026-1847', title: 'Hygienestationen und Eingangsschleusen für Lebensmittelbetrieb', country: 'Österreich', region: 'DACH', budget: 156000, currency: 'EUR', sourcePlatform: 'BBG', sourceUrl: 'https://www.bbg.gv.at/ttb/ttb.exe?ttb_id=2026-1847', publicationDate: '2026-06-02', submissionDeadline: '2026-07-10', description: 'Personenschleusen mit Hygienestation für Fleischverarbeitung.', industry: 'Food' },
  { id: 'bbg-2026-1902', title: 'Reinigungsanlage Pharma-Produktion Wien', country: 'Österreich', region: 'DACH', budget: 380000, currency: 'EUR', sourcePlatform: 'BBG', sourceUrl: 'https://www.bbg.gv.at/ttb/ttb.exe?ttb_id=2026-1902', publicationDate: '2026-06-01', submissionDeadline: '2026-07-20', description: 'CIP-Reinigungssystem für Pharma-Werk in Wien.', industry: 'Pharma' },
  { id: 'simap-2026-4421', title: 'SANICARE Eingangssystem Pharma-Werk Basel', country: 'Schweiz', region: 'DACH', budget: 365000, currency: 'CHF', sourcePlatform: 'Simap', sourceUrl: 'https://www.simap.ch/shabforms/COMMON/search/subscriptionDetail.cfm?noticeId=2026-4421', publicationDate: '2026-05-22', submissionDeadline: '2026-07-22', description: 'Hochwertiges Eingangssystem mit Kleidungswechsel für Pharma-Werk.', industry: 'Pharma' },
  { id: 'deutsche-evergabe-2026-771', title: 'Industrielle Hygieneanlage Getränkeproduktion', country: 'Deutschland', region: 'DACH', budget: 245000, currency: 'EUR', sourcePlatform: 'Deutsche e-Vergabe', sourceUrl: 'https://www.deutsche-evergabe.de/dashboards/dashboard_off.html', publicationDate: '2026-06-03', submissionDeadline: '2026-07-12', description: 'Komplettes Hygienesystem für Getränkeabfüllanlage.', industry: 'Food' },

  // UK
  { id: 'find-tender-uk-2026-8834', title: 'Sole cleaners and personnel hygiene airlocks – food factory', country: 'UK', region: 'UK', budget: 118000, currency: 'GBP', sourcePlatform: 'Find a Tender', sourceUrl: 'https://www.find-tender.service.gov.uk/Notice/2026-8834', publicationDate: '2026-05-20', submissionDeadline: '2026-07-05', description: 'Sole cleaners and airlocks for new food manufacturing facility.', industry: 'Food' },
  { id: 'contracts-finder-2026-5521', title: 'Hospital wash stations and hygiene dispensers', country: 'UK', region: 'UK', budget: 34000, currency: 'GBP', sourcePlatform: 'Contracts Finder', sourceUrl: 'https://www.contractsfinder.service.gov.uk/Notice/2026-5521', publicationDate: '2026-06-06', submissionDeadline: '2026-06-30', description: 'Wash stations and soap dispensers for NHS hospital wing.', industry: 'Hospital' },
  { id: 'find-tender-uk-2026-9012', title: 'Industrial cleaning system for beverage bottling', country: 'UK', region: 'UK', budget: 275000, currency: 'GBP', sourcePlatform: 'Find a Tender', sourceUrl: 'https://www.find-tender.service.gov.uk/Notice/2026-9012', publicationDate: '2026-06-09', submissionDeadline: '2026-08-01', description: 'Complete cleaning and sanitation system for bottling plant.', industry: 'Food' },

  // Middle East
  { id: 'uae-tanmia-2026-334', title: 'Food processing hygiene entrance systems – Abu Dhabi', country: 'VAE', region: 'Middle East', budget: 320000, currency: 'AED', sourcePlatform: 'UAE Tanmia', sourceUrl: 'https://www.tawteen.ae/en/Pages/default.aspx', publicationDate: '2026-05-25', submissionDeadline: '2026-07-30', description: 'Hygienic entrance and personnel cleaning systems for food plant.', industry: 'Food' },
  { id: 'etimad-2026-7788', title: 'Hospital sanitation and disinfection equipment', country: 'Saudi-Arabien', region: 'Middle East', budget: 185000, currency: 'SAR', sourcePlatform: 'Etimad', sourceUrl: 'https://tenders.etimad.sa/Tender/DetailsForVisitor?STenderId=2026-7788', publicationDate: '2026-06-01', submissionDeadline: '2026-07-15', description: 'Sanitation equipment for government hospital complex.', industry: 'Hospital' },
  { id: 'qatar-tenders-2026-112', title: 'Industrial hygiene solutions for production facility', country: 'Katar', region: 'Middle East', budget: 210000, currency: 'QAR', sourcePlatform: 'Qatar Tenders', sourceUrl: 'https://www.qatartenders.com/tender/industrial-hygiene-2026-112', publicationDate: '2026-06-05', submissionDeadline: '2026-08-05', description: 'Full hygiene solution for industrial production site.', industry: 'Production' },

  // Afrika
  { id: 'za-etenders-2026-8891', title: 'Meat processing hygiene and cleaning plant', country: 'Südafrika', region: 'Afrika', budget: 145000, currency: 'ZAR', sourcePlatform: 'eTenders RSA', sourceUrl: 'https://www.etenders.gov.za/home/Advert?advertId=2026-8891', publicationDate: '2026-05-18', submissionDeadline: '2026-07-08', description: 'Hygiene and cleaning infrastructure for meat processing plant.', industry: 'Food' },
  { id: 'kenya-tenders-2026-445', title: 'Hospital hygiene stations – Nairobi medical centre', country: 'Kenia', region: 'Afrika', budget: 28000, currency: 'KES', sourcePlatform: 'Kenya Tenders', sourceUrl: 'https://tenders.go.ke/tender/hospital-hygiene-2026-445', publicationDate: '2026-06-07', submissionDeadline: '2026-06-28', description: 'Hygiene stations for new medical centre construction.', industry: 'Hospital' },
  { id: 'egypt-tenders-2026-223', title: 'Food industry cleaning and sanitation systems', country: 'Ägypten', region: 'Afrika', budget: 95000, currency: 'EGP', sourcePlatform: 'Egypt Tenders', sourceUrl: 'https://etenders.gov.eg/en/Tender/Details/2026-223', publicationDate: '2026-06-02', submissionDeadline: '2026-07-18', description: 'Cleaning systems for food production facility.', industry: 'Food' },

  // Asien
  { id: 'austender-2026-7712', title: 'Industrial hygiene equipment for beverage production', country: 'Australien', region: 'Asien-Pazifik', budget: 245000, currency: 'AUD', sourcePlatform: 'AusTender', sourceUrl: 'https://www.tenders.gov.au/Cn/ShowCn/7712', publicationDate: '2026-06-01', submissionDeadline: '2026-07-25', description: 'Hygiene systems for new beverage production facility.', industry: 'Food' },
  { id: 'gebiz-2026-3344', title: 'Hospital cleaning and hygiene systems', country: 'Singapur', region: 'Asien-Pazifik', budget: 168000, currency: 'SGD', sourcePlatform: 'GeBIZ', sourceUrl: 'https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=search&cftId=2026-3344', publicationDate: '2026-05-30', submissionDeadline: '2026-07-10', description: 'Hospital-grade cleaning and hygiene infrastructure.', industry: 'Hospital' },
  { id: 'etenders-ie-2026-4421', title: 'Hospital hygiene dispensers and wash stations', country: 'Irland', region: 'Europa', budget: 38000, currency: 'EUR', sourcePlatform: 'eTenders', sourceUrl: 'https://www.etenders.gov.ie/epps/cft/prepareViewCfTWS.do?resourceId=2026-4421', publicationDate: '2026-06-05', submissionDeadline: '2026-06-22', description: 'Dispensers and wash stations for surgical wing.', industry: 'Hospital' },
  { id: 'india-gem-2026-9912', title: 'Industrial washing systems for food processing unit', country: 'Indien', region: 'Asien-Pazifik', budget: 78000, currency: 'INR', sourcePlatform: 'GeM', sourceUrl: 'https://bidplus.gem.gov.in/showbidDocument/2026-9912', publicationDate: '2026-06-04', submissionDeadline: '2026-07-20', description: 'Industrial washing and hygiene for food processing.', industry: 'Food' },
  { id: 'japan-jgpp-2026-556', title: 'Pharma facility hygiene entrance system', country: 'Japan', region: 'Asien-Pazifik', budget: 290000, currency: 'JPY', sourcePlatform: 'JGPP', sourceUrl: 'https://www.gov-procurement.go.jp/EN/notice/2026-556', publicationDate: '2026-05-28', submissionDeadline: '2026-08-15', description: 'Personnel hygiene airlock for pharmaceutical facility.', industry: 'Pharma' },

  // Ausschluss-Test (wird gefiltert)
  { id: 'us-sam-2026-001', title: 'Federal office cleaning services', country: 'USA', region: 'North America', budget: 500000, currency: 'USD', sourcePlatform: 'SAM.gov', sourceUrl: 'https://sam.gov/opp/2026-001', publicationDate: '2026-06-01', submissionDeadline: '2026-07-01', description: 'Office cleaning contract – excluded region.', industry: 'Public' },
];

function isExcluded(tender) {
  return EXCLUDED_COUNTRIES.some(
    (c) => tender.country.toLowerCase() === c.toLowerCase() || tender.region === 'North America',
  );
}

function toEurBudget(budget, currency) {
  const rates = { EUR: 1, GBP: 1.17, CHF: 1.05, AED: 0.25, SAR: 0.24, QAR: 0.25, ZAR: 0.05, KES: 0.007, EGP: 0.019, AUD: 0.61, SGD: 0.69, INR: 0.011, JPY: 0.0062 };
  return Math.round(budget * (rates[currency] || 1));
}

/**
 * @returns {Promise<{tenders: object[], source: string, regions: string[]}>}
 */
export async function searchGlobalTenders() {
  await new Promise((r) => setTimeout(r, 600));

  const tenders = GLOBAL_TENDERS.filter((t) => !isExcluded(t)).map((t) => ({
    ...t,
    budgetEur: toEurBudget(t.budget, t.currency),
    keywords: extractKeywords(t),
  }));

  const regions = [...new Set(tenders.map((t) => t.region))];

  return {
    tenders,
    source: 'global-simulation',
    regions,
    total: tenders.length,
    excluded: GLOBAL_TENDERS.length - tenders.length,
  };
}

function extractKeywords(tender) {
  const text = `${tender.title} ${tender.description} ${tender.industry}`.toLowerCase();
  const kws = ['hygiene', 'cleaning', 'sanitation', 'hospital', 'food', 'pharma', 'disinfection', 'industrial'];
  return kws.filter((k) => text.includes(k));
}

export function filterByRegion(tenders, region) {
  if (!region || region === 'all') return tenders;
  return tenders.filter((t) => t.region === region);
}

export function filterByCountry(tenders, country) {
  if (!country || country === 'all') return tenders;
  return tenders.filter((t) => t.country.toLowerCase().includes(country.toLowerCase()));
}

export { EXCLUDED_COUNTRIES, GLOBAL_TENDERS };
