/**
 * PHT Produktprofile – Vertriebszuordnung
 */

export const PRODUCT_PROFILES = [
  {
    id: 'personalhygiene',
    name: 'Personalhygiene',
    icon: '🧴',
    description: 'Handhygiene, Spender, Waschstationen, Eingangsschleusen',
    keywords: ['hand', 'hygiene', 'desinfektion', 'spender', 'wasch', 'personal', 'ewg', 'hygienestation'],
    products: ['EWG Handhygiene-System', 'Hygiene-Spender', 'COMBI Hygienestation'],
  },
  {
    id: 'reinigungstechnik',
    name: 'Reinigungstechnik',
    icon: '💧',
    description: 'Niederdruck, CIP, Behälter- und Kistenwäsche',
    keywords: ['cleaning', 'reinigung', 'cip', 'washing', 'niederdruck', 'crate', 'container', 'wasch'],
    products: ['Niederdruck-Reinigungssystem', 'Industriewaschbecken'],
  },
  {
    id: 'betriebshygiene',
    name: 'Betriebshygiene',
    icon: '🏭',
    description: 'Industrielle Hygieneanlagen, Sohlenreiniger, Facility',
    keywords: ['industrial', 'facility', 'sohle', 'eingang', 'sanicare', 'production', 'betrieb'],
    products: ['SANICARE Eingangssystem', 'DZW Sohlenreiniger', 'EKW Industrieanlage'],
  },
  {
    id: 'komplettloesung',
    name: 'Komplettlösung',
    icon: '⚡',
    description: 'Komplettanlagen für Food, Pharma, Hospital',
    keywords: ['complete', 'komplett', 'plant', 'anlage', 'food production', 'pharma', 'hospital', 'gmp'],
    products: ['EKW Industrieanlage', 'SANICARE Eingangssystem', 'Niederdruck-Reinigungssystem'],
  },
];

export function matchProductProfiles(text) {
  const lower = text.toLowerCase();
  return PRODUCT_PROFILES.map((profile) => {
    const hits = profile.keywords.filter((kw) => lower.includes(kw));
    return { ...profile, score: hits.length, matchedKeywords: hits };
  })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function getTopProfiles(text, limit = 2) {
  const matches = matchProductProfiles(text);
  return matches.length ? matches.slice(0, limit) : [PRODUCT_PROFILES[0]];
}
