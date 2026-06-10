/** PHT Power-Tool – zentrale Such- & Match-Konfiguration */

export const PHT_MATCH_KEYWORDS = [
  'hygiene', 'cleaning', 'cip', 'food production', 'hospital', 'sanitation',
  'disinfection', 'reinigung', 'desinfektion', 'wasch', 'pharma', 'food',
  'hygienestation', 'personenschleuse', 'sohlenreiniger', 'sanicare',
  'niederdruck', 'desinfektionsmittel', 'gmp', 'lebensmittel', 'klinik',
  'krankenhaus', 'waschanlage', 'behälterreinigung', 'facility', 'ewg',
  'handdesinfektion', 'clean room', 'reinraum', 'schleuse', 'washing',
  'crate washer', 'container wash', 'betriebshygiene', 'industrial hygiene',
];

/** CPV-Codes: Hygiene, Reinigung, Medizin, Lebensmittelmaschinen */
export const PHT_CPV_CODES = [
  '42996600', '44614300', '44617000', '33192120', '33790000', '90910000',
  '90911000', '90919000', '45262600', '45330000', '42924700', '39830000',
];

export const TED_SEARCH_QUERIES = [
  'FT~(hygiene OR cleaning OR hospital)',
  'FT~(sanitation OR disinfection OR food)',
  'FT~(reinigung OR desinfektion OR pharma)',
  'FT~(CIP OR washing OR hygienestation)',
  'FT~(sohlenreiniger OR personenschleuse OR sanicare)',
  'FT~(industrial hygiene OR betriebshygiene OR GMP)',
  'FT~(crate washer OR container wash OR niederdruck)',
];

/** DACH-Fokus für Marktführer-Strategie */
export const TED_DACH_QUERIES = [
  'FT~(hygiene OR reinigung) AND CY=(DEU OR AUT OR CHE)',
  'FT~(CIP OR desinfektion OR hospital) AND CY=(DEU OR AUT OR CHE)',
  'FT~(food production OR pharma OR GMP) AND CY=(DEU OR AUT OR CHE)',
];

export const TED_CPV_QUERIES = PHT_CPV_CODES.slice(0, 5).map(
  (code) => `PC=${code}`,
);

export const BID_CHECKLIST_ITEMS = [
  'Ausschreibungsunterlagen vollständig gelesen',
  'Technische Machbarkeit mit Produktion geklärt',
  'PHT-Produktprofil & Alternativen gewählt',
  'Preiskalkulation inkl. Logistik & Service',
  'Referenzprojekte & Zertifikate bereit',
  'Eignungsnachweise / ISO / GMP geprüft',
  'Rechtliche & vertragliche Bedingungen geprüft',
  'Interne Freigabe Vertrieb / GF',
  'Angebot fristgerecht eingereicht',
  'Nachfassen & Feedback dokumentiert',
];
