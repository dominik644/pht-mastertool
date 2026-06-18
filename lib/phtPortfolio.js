/**
 * PHT Portfolio Segments – zentrale Vertriebszuordnung.
 * Quellen: Preisliste 2026, pht.group, pht.de, Produktprofile.
 * Ausrüstung & Anlagen – keine Reinigungsdienstleistungen.
 */
import { keywordMatchesInText, hasFoodFacilityOpportunitySignal } from './phtMatchRules.js';
import { PHT_CPV_EQUIPMENT_CODES } from './phtConfig.js';
import { CATALOG_GO_THRESHOLD } from './phtProductMatch.js';

/** @typedef {{
 *   id: string,
 *   name: string,
 *   nameEn: string,
 *   icon: string,
 *   industries: string[],
 *   useCases: string[],
 *   keywords: { de: string[], en: string[], fr: string[] },
 *   cpvCodes: string[],
 *   minBudgetEur: number,
 *   exclusionKeywords: string[],
 *   lineId?: string,
 * }} PortfolioSegment */

/** @type {PortfolioSegment[]} */
export const PHT_PORTFOLIO_SEGMENTS = [
  {
    id: 'industrial-washers',
    name: 'Industriewaschanlagen / Sonderbau',
    nameEn: 'Industrial Washers / Custom Build',
    icon: '🏭',
    industries: ['Food', 'Pharma', 'Production', 'Logistics'],
    useCases: ['Kistenwäsche', 'IBC 1000L', 'Paletten', 'Mülltonnen', 'Blumentöpfe', 'Wareneingang'],
    keywords: {
      de: [
        'sonderbau', 'waschanlage', 'industriewasch', 'industriewaschanlage', 'kistenwasch', 'kistenwäsche',
        'kistenwaschanlage', 'behälterwasch', 'behaelterwasch', 'behälterwaschanlage', 'palettenwasch',
        'palettenwascher', 'palettenwaschanlage', 'mülltonnenwasch', 'muelltonnenwasch', 'tonnenwasch',
        'containerwasch', 'container wasch', 'blumentopf', 'blumentöpfe', '1000 liter', '1000l', 'ibc',
        'dolav', 'waschkabinett', 'reinigungsanlage', 'industriewaschmaschine', 'ekw', 'edw', 'epw', 'enw',
      ],
      en: [
        'crate washer', 'box washer', 'pallet washer', 'ibc washer', 'wheelie bin washer', 'container wash',
        'industrial washer', 'industrial washing', 'bin washer', 'pot washer', 'custom build washer',
      ],
      fr: [
        'laveuse industrielle', 'lave-caisse', 'lave-palette', 'lave-conteneur', 'lave-bac', 'machine à laver industrielle',
      ],
    },
    cpvCodes: ['42924700', '42996600', '42920000', '39711300', '39713400', '44614300', '44617000'],
    minBudgetEur: 25000,
    exclusionKeywords: ['unterhaltsreinigung', 'gebäudereinigung', 'cleaning service', 'janitorial'],
    lineId: 'industriewaschanlagen',
  },
  {
    id: 'foam-low-pressure-hygiene',
    name: 'Schaum- & Niederdruck / Hygienestationen',
    nameEn: 'Foam / Low-Pressure / Hygiene Stations',
    icon: '🫧',
    industries: ['Food', 'Production', 'Pharma', 'Hospital'],
    useCases: ['Werkstatt', 'Produktionshalle', 'Logistik', 'Eingangskontrolle', 'Personenschleuse'],
    keywords: {
      de: [
        'schaumstation', 'schaumstationen', 'schaumanlage', 'niederdruck', 'niederdruckanlage',
        'hauptstation', 'satellitenstation', 'schäumer', 'schaeumer', 'schaumreinigung', 'bodendose',
        'druckerhöhungsanlage', 'hygienestation', 'handreinigungsbecken', 'handreinigungsrinne',
        'sohlenreiniger', 'sohlendesinfektion', 'personenschleuse', 'eingangskontrolle', 'foamico',
        'automatik hauptstation', 'mobile hauptstation', 'fahrwagen schaumreinigung', 'combi', 'ndr',
      ],
      en: [
        'foam station', 'low pressure cleaning', 'foam cleaning', 'hygiene station', 'foamer',
        'satellite station', 'main station', 'sole cleaner', 'boot washer', 'entrance control',
      ],
      fr: [
        'station mousse', 'basse pression', 'station hygiène', 'désinfection des semelles',
        'station principale', 'station satellite', 'mousseur',
      ],
    },
    cpvCodes: ['33192120', '33790000', '39830000', '44614300'],
    minBudgetEur: 8000,
    exclusionKeywords: ['catering', 'verpflegung', 'meal service'],
    lineId: 'schaumniederdruck',
  },
  {
    id: 'personal-hygiene',
    name: 'Personalhygiene',
    nameEn: 'Personal Hygiene',
    icon: '🧴',
    industries: ['Food', 'Hospital', 'Pharma', 'Production'],
    useCases: ['Eingang', 'Umkleide', 'Kantine', 'Produktionsbereich'],
    keywords: {
      de: [
        'handhygiene', 'handreinigung', 'handdesinfektion', 'seifenspender', 'händetrockner',
        'haendetrockner', 'desinfektionsmatte', 'ewg', 'hdt', 'hst', 'spender',
      ],
      en: ['hand hygiene', 'soap dispenser', 'hand dryer', 'hand wash station', 'sanitizer dispenser'],
      fr: ['hygiène des mains', 'distributeur savon', 'sèche-mains', 'lavabo'],
    },
    cpvCodes: ['33192120', '33790000', '39134000'],
    minBudgetEur: 3000,
    exclusionKeywords: ['windel', 'diaper', 'inkontinenz'],
    lineId: 'personalhygiene',
  },
  {
    id: 'lockers-wardrobe',
    name: 'Spinde / Garderobe / Wertfach',
    nameEn: 'Lockers / Wardrobe / Valuables',
    icon: '🗄️',
    industries: ['Public', 'Hospital', 'Sports', 'Production'],
    useCases: ['Umkleide', 'Feuerwehr', 'Sportstätte', 'Krankenhaus', 'Wertaufbewahrung'],
    keywords: {
      de: [
        'spind', 'spinde', 'schließfach', 'schliessfach', 'garderobe', 'garderoben', 'garderobenschrank',
        'wertfachschrank', 'wertfach', 'umkleide', 'umkleideraum', 'umkleidekabine', 'feuerwehrspind',
        'feuerwehrspinde', 'schließfachschrank',
      ],
      en: [
        'locker', 'lockers', 'wardrobe', 'changing room', 'changing locker', 'valuables locker',
        'safe locker', 'firefighter locker', 'fire station locker',
      ],
      fr: ['casier', 'vestiaire', 'consigne', 'armoire vestiaire', 'casier pompier'],
    },
    cpvCodes: ['39134000', '39134100', '39130000', '44421720'],
    minBudgetEur: 5000,
    exclusionKeywords: ['it locker', 'software locker', 'digital locker system only'],
    lineId: 'schliessfach-garderobe',
  },
  {
    id: 'cleaning-tools',
    name: 'Reinigungsgeräte & Utensilien',
    nameEn: 'Cleaning Tools & Utensils',
    icon: '🧹',
    industries: ['Food', 'Hospital', 'Production', 'Public'],
    useCases: ['Reinigungswagen', 'Hygienestation', 'Produktionsbereich', 'Lager'],
    keywords: {
      de: [
        'besen', 'bürste', 'buerste', 'bürsten', 'schaufel', 'kehrschaufel', 'scheuerbürste',
        'handbürste', 'waschbürste', 'reinigungsgerät', 'reinigungsgeraete', 'reinigungsbedarf',
        'bürstenreinigungsstation', 'reinigungsutensilien',
      ],
      en: ['broom', 'brooms', 'brush', 'brushes', 'dustpan', 'floor brush', 'cleaning brush', 'cleaning tools'],
      fr: ['balai', 'brosse', 'pelle', 'ustensiles de nettoyage', 'brosserie'],
    },
    cpvCodes: ['39830000', '33790000'],
    minBudgetEur: 500,
    exclusionKeywords: ['reinigungsdienst', 'cleaning service', 'unterhaltsreinigung'],
    lineId: 'reinigungsgeraete',
  },
  {
    id: 'food-facility-construction',
    name: 'Lebensmittelbetriebe Umbau/Neubau',
    nameEn: 'Food Facility Construction / Renovation',
    icon: '🏗️',
    industries: ['Food', 'Production'],
    useCases: ['Neubau Produktionshalle', 'Umbau Molkerei', 'Schlachthof-Erweiterung', 'Bäckerei Sanierung'],
    keywords: {
      de: [
        'lebensmittelbetrieb', 'lebensmittelbetriebe', 'lebensmittelindustrie', 'lebensmittelproduktion',
        'nahrungsmittelbetrieb', 'molkerei', 'milchbildungszentrum', 'milchverarbeitung', 'milchwerk',
        'schlachthof', 'bäckerei', 'baeckerei', 'brauerei', 'käserei', 'kaeserei',
        'fleischverarbeitung', 'produktionshalle', 'anlagenbau', 'umbau', 'zubau', 'neubau', 'erweiterung',
        'sanierung', 'modernisierung', 'kühlhaus', 'kuehlhaus',
      ],
      en: [
        'food facility', 'food plant', 'food processing', 'food industry', 'food factory',
        'dairy plant', 'dairy factory', 'cheese plant', 'slaughterhouse', 'meat processing plant',
        'brewery', 'food manufacturing', 'new build', 'renovation', 'extension',
        'turnkey food', 'food processing plant construction', 'cold storage facility',
      ],
      fr: [
        'industrie agroalimentaire', 'usine alimentaire', 'laiterie', 'abattoir', 'boulangerie',
        'transformation alimentaire', 'construction agroalimentaire', 'rénovation usine',
        'cuisine centrale',
      ],
    },
    cpvCodes: ['45210000', '45220000', '45330000', '42924700', '33192120'],
    minBudgetEur: 50000,
    exclusionKeywords: ['catering only', 'meal delivery', 'food supply contract'],
    lineId: 'lebensmittel-anlagenbau',
  },
  {
    id: 'betriebshygiene',
    name: 'Betriebshygiene / Eingangssysteme',
    nameEn: 'Operational Hygiene / Entrance Systems',
    icon: '🚪',
    industries: ['Food', 'Pharma', 'Hospital', 'Production'],
    useCases: ['Werkseingang', 'Pharma-Schleuse', 'Krankenhaus-Eingang', 'Lebensmittelbetrieb'],
    keywords: {
      de: [
        'betriebshygiene', 'sohlenreiniger', 'sohlendesinfektion', 'sanicare', 'dzw', 'portaldrehkreuz',
        'schürzenreinigung', 'stiefelreiniger', 'schuhtrocknung', 'stiefeltrockner', 'eingangssystem',
        'schuhtrocknungssystem',
      ],
      en: ['operational hygiene', 'sole disinfection', 'boot washer', 'apron washer', 'entrance system'],
      fr: ['hygiène opérationnelle', 'désinfection semelles', 'séchage bottes'],
    },
    cpvCodes: ['33192120', '44614300', '33790000'],
    minBudgetEur: 10000,
    exclusionKeywords: ['building cleaning', 'unterhaltsreinigung'],
    lineId: 'betriebshygiene',
  },
  {
    id: 'healthcare',
    name: 'Gesundheitswesen / Klinik-Hygiene',
    nameEn: 'Healthcare / Clinical Hygiene',
    icon: '🏥',
    industries: ['Hospital', 'Pharma'],
    useCases: ['Krankenhaus-Eingang', 'OP-Vorbereitung', 'Pharma-Schleuse', 'Klinik-Umkleide'],
    keywords: {
      de: ['krankenhaus', 'klinik', 'spital', 'klinikhygiene', 'op-bereich', 'pharma', 'gmp', 'reinraum'],
      en: ['hospital', 'clinic', 'healthcare facility', 'operating room', 'clean room', 'gmp', 'pharma'],
      fr: ['hôpital', 'hopital', 'clinique', 'salle blanche', 'pharmaceutique'],
    },
    cpvCodes: ['33192120', '33790000', '44614300'],
    minBudgetEur: 15000,
    exclusionKeywords: ['patient transport', 'ambulance', 'medical devices only', 'windel', 'diaper'],
    lineId: 'personalhygiene',
  },
  {
    id: 'logistics',
    name: 'Logistik / Lager / Distribution',
    nameEn: 'Logistics / Warehouse',
    icon: '📦',
    industries: ['Logistics', 'Production', 'Food'],
    useCases: ['Logistikhalle', 'Wareneingang', 'Cross-Docking', 'Kühlhaus'],
    keywords: {
      de: ['logistik', 'logistikhalle', 'lager', 'distribution', 'wareneingang', 'cross-docking', 'kühlhaus'],
      en: ['logistics', 'warehouse', 'distribution center', 'goods receipt', 'cold storage'],
      fr: ['logistique', 'entrepôt', 'distribution', 'réception marchandises'],
    },
    cpvCodes: ['42924700', '44614300', '39711300'],
    minBudgetEur: 20000,
    exclusionKeywords: ['transport service', 'freight forwarding', 'courier'],
    lineId: 'industriewaschanlagen',
  },
  {
    id: 'municipalities',
    name: 'Kommunen / Öffentliche Einrichtungen',
    nameEn: 'Municipalities / Public Facilities',
    icon: '🏛️',
    industries: ['Public'],
    useCases: ['Schwimmbad', 'Sporthalle', 'Rathaus-Umkleide', 'Abfallwirtschaft'],
    keywords: {
      de: ['kommune', 'stadtwerke', 'öffentlich', 'schwimmbad', 'sporthalle', 'gemeinde', 'abfallwirtschaft'],
      en: ['municipality', 'public facility', 'swimming pool', 'sports hall', 'waste management'],
      fr: ['commune', 'municipalité', 'piscine', 'salle de sport', 'déchets'],
    },
    cpvCodes: ['39134000', '44614300', '42924700'],
    minBudgetEur: 10000,
    exclusionKeywords: ['road construction', 'straßenbau', 'public transport'],
    lineId: 'schliessfach-garderobe',
  },
  {
    id: 'fire-departments',
    name: 'Feuerwehr / Rettungsdienst',
    nameEn: 'Fire Departments / Emergency Services',
    icon: '🚒',
    industries: ['Public'],
    useCases: ['Feuerwehrhaus', 'Gerätehaus', 'Einsatzkleidung', 'Stiefeltrocknung'],
    keywords: {
      de: ['feuerwehr', 'feuerwehrhaus', 'feuerwehrspind', 'rettungsdienst', 'gerätehaus', 'einsatzkleidung'],
      en: ['fire department', 'fire station', 'firefighter locker', 'rescue service', 'fire brigade'],
      fr: ['pompiers', 'caserne pompiers', 'casier pompier', 'secours'],
    },
    cpvCodes: ['39134000', '33790000'],
    minBudgetEur: 8000,
    exclusionKeywords: ['fire truck', 'löschfahrzeug', 'vehicle purchase'],
    lineId: 'schliessfach-garderobe',
  },
];

/** Flat keyword list per segment (all languages). */
export function getSegmentKeywords(segment) {
  const kw = segment.keywords;
  return [...new Set([...kw.de, ...kw.en, ...kw.fr])];
}

/** All portfolio keywords flat. */
export const PHT_PORTFOLIO_KEYWORDS_FLAT = [
  ...new Set(PHT_PORTFOLIO_SEGMENTS.flatMap(getSegmentKeywords)),
];

/**
 * Match tender text against portfolio segments.
 * @returns {{ segmentId: string, name: string, score: number, matchedKeywords: string[], lineId?: string }[]}
 */
export function matchPortfolioSegments(text, cpvCodes = []) {
  const lower = String(text || '').toLowerCase();
  const cpv = (cpvCodes ?? []).map(String);
  const hits = [];

  for (const seg of PHT_PORTFOLIO_SEGMENTS) {
    const segExcl = seg.exclusionKeywords.some((kw) => lower.includes(kw));
    if (segExcl) continue;

    // Food-facility: kein reiner Hochbau-CPV ohne Lebensmittelbezug (Krankenhaus-Sanierung etc.)
    if (seg.id === 'food-facility-construction' && !hasFoodFacilityOpportunitySignal(lower)) continue;

    const allKw = getSegmentKeywords(seg);
    const matched = allKw.filter((kw) => keywordMatchesInText(lower, kw));
    const cpvHit = seg.cpvCodes.some((code) =>
      cpv.some((c) => c.startsWith(code.slice(0, 5)) || c === code),
    );

    if (!matched.length && !cpvHit) continue;

    const score = matched.length * 3 + (cpvHit ? 8 : 0);
    hits.push({
      segmentId: seg.id,
      name: seg.name,
      score,
      matchedKeywords: matched.slice(0, 8),
      lineId: seg.lineId,
      cpvMatch: cpvHit,
    });
  }

  return hits.sort((a, b) => b.score - a.score);
}

export function getTopPortfolioSegment(text, cpvCodes = []) {
  const hits = matchPortfolioSegments(text, cpvCodes);
  return hits[0] ?? null;
}

export function cpvIsPortfolioEquipment(cpvCodes = []) {
  const cpv = (cpvCodes ?? []).map(String);
  return PHT_CPV_EQUIPMENT_CODES.some((code) =>
    cpv.some((c) => c.startsWith(code.slice(0, 5)) || c === code),
  );
}

/**
 * True if tender maps to at least one portfolio segment (keyword, segment CPV, or equipment CPV).
 */
export function matchesAnyPortfolioSegment(text, cpvCodes = []) {
  if (matchPortfolioSegments(text, cpvCodes).length > 0) return true;
  return cpvIsPortfolioEquipment(cpvCodes);
}

/**
 * Portfolio filter for UI: catalog ≥12 OR food facility segment OR equipment CPV.
 */
export function meetsPortfolioActionableFilter(text, cpvCodes = [], catalogScore = 0) {
  if (catalogScore >= CATALOG_GO_THRESHOLD) return true;
  if (cpvIsPortfolioEquipment(cpvCodes)) return true;
  const hits = matchPortfolioSegments(text, cpvCodes);
  if (hits.some((h) => h.segmentId === 'food-facility-construction')) return true;
  if (hits.length > 0 && catalogScore >= 8) return true;
  return false;
}

export function getPortfolioSegmentById(id) {
  return PHT_PORTFOLIO_SEGMENTS.find((s) => s.id === id) ?? null;
}

export function getPortfolioLineIds() {
  return [...new Set(PHT_PORTFOLIO_SEGMENTS.map((s) => s.lineId).filter(Boolean))];
}
