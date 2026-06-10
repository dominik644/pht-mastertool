/** DACH-spezifische Demo-Erweiterung (BBG, Simap, e-Vergabe) */
const DACH_TENDERS = [
  {
    id: 'dach-bbg-2026-771',
    title: 'Industrielle Hygieneanlage Getränkeproduktion',
    country: 'Deutschland', region: 'DACH', budget: 245000, currency: 'EUR',
    sourcePlatform: 'Deutsche e-Vergabe', sourceUrl: 'https://www.deutsche-evergabe.de/',
    publicationDate: '2026-06-03', submissionDeadline: '2026-07-12', decisionDate: '2026-07-28',
    description: 'Komplettes Hygienesystem für Getränkeabfüllanlage.', industry: 'Food', cpvCodes: [],
  },
];

export function getDACHTenders() {
  return DACH_TENDERS;
}
