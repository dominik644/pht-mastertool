const AFRICA_TENDERS = [
  { id: 'af-za-8891', title: 'Meat processing hygiene and cleaning plant', country: 'Südafrika', region: 'Afrika', budget: 145000, currency: 'ZAR', sourcePlatform: 'eTenders RSA', sourceUrl: 'https://www.etenders.gov.za/', publicationDate: '2026-05-18', submissionDeadline: '2026-07-08', decisionDate: '2026-07-25', description: 'Hygiene and cleaning infrastructure for meat processing plant.', industry: 'Food', cpvCodes: [] },
  { id: 'af-ke-445', title: 'Hospital hygiene stations – Nairobi medical centre', country: 'Kenia', region: 'Afrika', budget: 28000, currency: 'KES', sourcePlatform: 'Kenya Tenders', sourceUrl: 'https://tenders.go.ke/', publicationDate: '2026-06-07', submissionDeadline: '2026-06-28', decisionDate: '2026-07-10', description: 'Hygiene stations for new medical centre construction.', industry: 'Hospital', cpvCodes: [] },
  { id: 'af-eg-223', title: 'Food industry cleaning and sanitation systems', country: 'Ägypten', region: 'Afrika', budget: 95000, currency: 'EGP', sourcePlatform: 'Egypt Tenders', sourceUrl: 'https://etenders.gov.eg/', publicationDate: '2026-06-02', submissionDeadline: '2026-07-18', decisionDate: '2026-08-01', description: 'Cleaning systems for food production facility.', industry: 'Food', cpvCodes: [] },
];

export function getAfricaTenders() {
  return AFRICA_TENDERS;
}
